from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import sqlite3
import os
import json
import hashlib
import secrets
import time
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
security = HTTPBearer(auto_error=False)

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "travel.db")


def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_users_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            avatar TEXT,
            provider TEXT DEFAULT 'email',
            password_hash TEXT,
            plan TEXT DEFAULT 'free',
            travel_memory TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.commit()
    conn.close()


init_users_db()


def hash_password(password: str) -> str:
    salt = os.getenv("SECRET_KEY", "atlas_default_secret_2024")
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = time.time() + (30 * 24 * 3600)  # 30 days
    conn = get_db()
    conn.execute(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
        (token, user_id, expires_at)
    )
    conn.commit()
    conn.close()
    return token


def get_user_from_token(token: str) -> Optional[dict]:
    if not token:
        return None
    conn = get_db()
    row = conn.execute(
        """SELECT u.* FROM users u
           JOIN sessions s ON s.user_id = u.id
           WHERE s.token = ? AND s.expires_at > ?""",
        (token, time.time())
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    user = get_user_from_token(credentials.credentials)
    return user


def require_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = get_user_from_token(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user


# ── Models ────────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    email: str
    name: str
    avatar: Optional[str] = None
    google_id: str


class UpdateMemoryRequest(BaseModel):
    memory: str


# ── Routes ───────────────────────────────────────────────────────────────────
@router.post("/register")
async def register(req: RegisterRequest):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user_id = secrets.token_urlsafe(16)
    password_hash = hash_password(req.password)

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="Email already registered")

    conn.execute(
        "INSERT INTO users (id, email, name, password_hash, provider) VALUES (?, ?, ?, ?, ?)",
        (user_id, req.email, req.name, password_hash, "email")
    )
    conn.commit()
    conn.close()

    token = create_session(user_id)
    return {
        "token": token,
        "user": {"id": user_id, "email": req.email, "name": req.name, "plan": "free", "avatar": None}
    }


@router.post("/login")
async def login(req: LoginRequest):
    password_hash = hash_password(req.password)
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM users WHERE email = ? AND password_hash = ?",
        (req.email, password_hash)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    conn.execute(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (row["id"],)
    )
    conn.commit()
    conn.close()

    token = create_session(row["id"])
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
async def google_auth(req: GoogleAuthRequest):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()

    if row:
        conn.execute(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP, name = ?, avatar = ? WHERE id = ?",
            (req.name, req.avatar, row["id"])
        )
        conn.commit()
        user_id = row["id"]
        plan = row["plan"]
    else:
        user_id = secrets.token_urlsafe(16)
        plan = "free"
        conn.execute(
            "INSERT INTO users (id, email, name, avatar, provider) VALUES (?, ?, ?, ?, ?)",
            (user_id, req.email, req.name, req.avatar, "google")
        )
        conn.commit()

    conn.close()
    token = create_session(user_id)
    return {
        "token": token,
        "user": {"id": user_id, "email": req.email, "name": req.name, "plan": plan, "avatar": req.avatar}
    }


@router.get("/me")
async def get_me(user=Depends(require_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "plan": user["plan"],
        "avatar": user["avatar"],
        "travel_memory": user.get("travel_memory", ""),
    }


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials:
        conn = get_db()
        conn.execute("DELETE FROM sessions WHERE token = ?", (credentials.credentials,))
        conn.commit()
        conn.close()
    return {"message": "Logged out"}


@router.put("/memory")
async def update_memory(req: UpdateMemoryRequest, user=Depends(require_user)):
    conn = get_db()
    conn.execute(
        "UPDATE users SET travel_memory = ? WHERE id = ?",
        (req.memory, user["id"])
    )
    conn.commit()
    conn.close()
    return {"message": "Memory updated"}
