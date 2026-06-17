import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator
from typing import Optional
import os
import bcrypt
import secrets
import time
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from .limiter import limiter
from .db import supabase
from .sanitize import sanitize as sanitize_text

logger = logging.getLogger("atlas.auth")

router = APIRouter()
security = HTTPBearer(auto_error=False)

MEMORY_MAX_LENGTH = 2000


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = time.time() + (30 * 24 * 3600)
    supabase.table("sessions").insert({
        "token": token,
        "user_id": user_id,
        "expires_at": expires_at,
    }).execute()
    return token


SESSION_COOKIE_NAME = "atlas_session"

def set_session_cookie(response: Response, token: str, max_age: int = 30 * 24 * 3600):
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=os.getenv("ENVIRONMENT") == "production",
        path="/",
    )

def clear_session_cookie(response: Response):
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
    )


def get_user_from_token(token: str) -> Optional[dict]:
    if not token:
        return None
    sess = supabase.table("sessions").select("*").eq("token", token).gt("expires_at", time.time()).execute()
    if not sess.data:
        return None
    user = supabase.table("users").select("*").eq("id", sess.data[0]["user_id"]).execute()
    return user.data[0] if user.data else None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    return get_user_from_token(credentials.credentials)


def require_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = get_user_from_token(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user


# ── Models ────────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class GoogleAuthRequest(BaseModel):
    email: str = Field(max_length=255)
    name: str = Field(max_length=100)
    avatar: Optional[str] = None
    google_id_token: str


class UpdateMemoryRequest(BaseModel):
    memory: str

    @field_validator("memory")
    @classmethod
    def sanitize_memory(cls, v):
        return sanitize_text(v, MEMORY_MAX_LENGTH)


# ── Routes ───────────────────────────────────────────────────────────────────
@router.post("/register")
@limiter.limit("5/minute")
async def register(req: RegisterRequest, response: Response, request: Request):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = supabase.table("users").select("id").eq("email", req.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = secrets.token_urlsafe(16)
    password_hash = hash_password(req.password)
    supabase.table("users").insert({
        "id": user_id,
        "email": req.email,
        "name": req.name,
        "password_hash": password_hash,
        "provider": "email",
    }).execute()

    token = create_session(user_id)
    set_session_cookie(response, token)
    return {
        "token": token,
        "user": {"id": user_id, "email": req.email, "name": req.name, "plan": "free", "avatar": None}
    }


@router.post("/login")
@limiter.limit("5/minute")
async def login(req: LoginRequest, response: Response, request: Request):
    result = supabase.table("users").select("*").eq("email", req.email).execute()
    if not result.data or not result.data[0].get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    row = result.data[0]

    password_valid = False
    try:
        password_valid = verify_password(req.password, row["password_hash"])
    except Exception as e:
        logger.error("Password verification error: %s", e)

    if not password_valid:
        import hashlib
        secret = os.getenv("SECRET_KEY", "")
        legacy_secret = os.getenv("LEGACY_HASH_SALT", "")
        for salt in [s for s in (legacy_secret, secret) if s]:
            legacy_hash = hashlib.sha256(f"{salt}{req.password}".encode()).hexdigest()
            if legacy_hash == row["password_hash"]:
                password_valid = True
                new_hash = hash_password(req.password)
                supabase.table("users").update({"password_hash": new_hash}).eq("id", row["id"]).execute()
                break

    if not password_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    supabase.table("users").update({"last_login": datetime.now(timezone.utc).isoformat()}).eq("id", row["id"]).execute()

    token = create_session(row["id"])
    set_session_cookie(response, token)
    return {
        "token": token,
        "user": {
            "id": row["id"],
            "email": row["email"],
            "name": row["name"],
            "plan": row["plan"],
            "avatar": row["avatar"],
        }
    }


@router.post("/google")
@limiter.limit("5/minute")
async def google_auth(req: GoogleAuthRequest, response: Response, request: Request):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    if google_client_id:
        try:
            id_info = id_token.verify_oauth2_token(
                req.google_id_token, google_requests.Request(), google_client_id
            )
            if id_info.get("email") != req.email:
                raise HTTPException(status_code=401, detail="Email mismatch in Google token")
        except ValueError as e:
            raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

    result = supabase.table("users").select("*").eq("email", req.email).execute()
    row = result.data[0] if result.data else None

    if row:
        supabase.table("users").update({
            "last_login": datetime.now(timezone.utc).isoformat(),
            "name": req.name,
            "avatar": req.avatar,
        }).eq("id", row["id"]).execute()
        user_id = row["id"]
        plan = row["plan"]
    else:
        user_id = secrets.token_urlsafe(16)
        plan = "free"
        supabase.table("users").insert({
            "id": user_id,
            "email": req.email,
            "name": req.name,
            "avatar": req.avatar,
            "provider": "google",
        }).execute()
    token = create_session(user_id)
    set_session_cookie(response, token)
    return {
        "token": token,
        "user": {"id": user_id, "email": req.email, "name": req.name, "plan": plan, "avatar": req.avatar}
    }


@router.get("/me")
@limiter.limit("20/minute")
async def get_me(request: Request, user=Depends(require_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "plan": user["plan"],
        "avatar": user["avatar"],
        "provider": user.get("provider", "email"),
        "travel_memory": user.get("travel_memory", ""),
        "created_at": user.get("created_at"),
        "last_login": user.get("last_login"),
    }


@router.get("/check-cookie")
@limiter.limit("20/minute")
async def check_cookie(request: Request):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return {"authenticated": False}
    user = get_user_from_token(token)
    if not user:
        return {"authenticated": False}
    return {
        "authenticated": True,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "plan": user["plan"],
            "avatar": user["avatar"],
            "provider": user.get("provider", "email"),
            "travel_memory": user.get("travel_memory", ""),
            "created_at": user.get("created_at"),
            "last_login": user.get("last_login"),
        }
    }


@router.post("/logout")
@limiter.limit("20/minute")
async def logout(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security), response: Response = None):
    if credentials:
        supabase.table("sessions").delete().eq("token", credentials.credentials).execute()
    if response:
        clear_session_cookie(response)
    return {"message": "Logged out"}


@router.put("/memory")
@limiter.limit("10/minute")
async def update_memory(request: Request, req: UpdateMemoryRequest, user=Depends(require_user)):
    cleaned = sanitize_text(req.memory, MEMORY_MAX_LENGTH)
    supabase.table("users").update({"travel_memory": cleaned}).eq("id", user["id"]).execute()
    return {"message": "Memory updated"}
