import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from .auth import get_current_user
from .db import supabase
from .limiter import limiter
import secrets

logger = logging.getLogger("atlas.chat_history")

router = APIRouter()


class ConversationCreate(BaseModel):
    title: str = "New Chat"
    first_message: Optional[str] = None


class MessageSave(BaseModel):
    role: str
    content: str


# ── List conversations ────────────────────────────────────────────────────

@router.get("/conversations")
@limiter.limit("30/minute")
async def list_conversations(request: Request, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    try:
        result = (
            supabase.table("conversations")
            .select("id, title, created_at, updated_at")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .execute()
        )
        return {"conversations": result.data or []}
    except Exception as e:
        logger.warning("Failed to list conversations (table may not exist): %s", e)
        return {"conversations": []}


# ── Create conversation ───────────────────────────────────────────────────

@router.post("/conversations")
@limiter.limit("10/minute")
async def create_conversation(request: Request, req: ConversationCreate, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    conv_id = secrets.token_urlsafe(16)
    now = datetime.now(timezone.utc).isoformat()

    data = {
        "id": conv_id,
        "user_id": user_id,
        "title": req.title,
        "created_at": now,
        "updated_at": now,
    }

    try:
        supabase.table("conversations").insert(data).execute()
    except Exception as e:
        logger.warning("Failed to create conversation (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Chat history storage unavailable")

    # If first_message provided, save it immediately
    if req.first_message:
        try:
            msg_data = {
                "conversation_id": conv_id,
                "role": "user",
                "content": req.first_message,
                "created_at": now,
            }
            supabase.table("messages").insert(msg_data).execute()
        except Exception as e:
            logger.warning("Failed to save first message (table may not exist): %s", e)

    return {"id": conv_id, "title": req.title, "created_at": now}


# ── Get conversation messages ─────────────────────────────────────────────

@router.get("/conversations/{conv_id}/messages")
@limiter.limit("30/minute")
async def get_messages(request: Request, conv_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")

    try:
        conv = supabase.table("conversations").select("user_id").eq("id", conv_id).execute()
    except Exception as e:
        logger.warning("Failed to query conversations (table may not exist): %s", e)
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not conv.data or conv.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        result = (
            supabase.table("messages")
            .select("id, role, content, created_at")
            .eq("conversation_id", conv_id)
            .order("created_at", asc=True)
            .execute()
        )
        return {"conversation_id": conv_id, "messages": result.data or []}
    except Exception as e:
        logger.warning("Failed to get messages (table may not exist): %s", e)
        return {"conversation_id": conv_id, "messages": []}


# ── Save a message ────────────────────────────────────────────────────────

@router.post("/conversations/{conv_id}/messages")
@limiter.limit("30/minute")
async def save_message(request: Request, conv_id: str, msg: MessageSave, user: dict = Depends(get_current_user)):
    user_id = user.get("id")

    try:
        conv = supabase.table("conversations").select("user_id").eq("id", conv_id).execute()
    except Exception as e:
        logger.warning("Failed to verify conversation (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Chat history storage unavailable")
    if not conv.data or conv.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    now = datetime.now(timezone.utc).isoformat()
    msg_data = {
        "conversation_id": conv_id,
        "role": msg.role,
        "content": msg.content,
        "created_at": now,
    }

    try:
        supabase.table("messages").insert(msg_data).execute()
        supabase.table("conversations").update({"updated_at": now}).eq("id", conv_id).execute()
    except Exception as e:
        logger.warning("Failed to save message (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Chat history storage unavailable")

    return {"status": "ok"}


# ── Update conversation title ─────────────────────────────────────────────

@router.put("/conversations/{conv_id}")
@limiter.limit("10/minute")
async def update_conversation(request: Request, conv_id: str, title: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")

    try:
        conv = supabase.table("conversations").select("user_id").eq("id", conv_id).execute()
    except Exception as e:
        logger.warning("Failed to update conversation (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Chat history storage unavailable")
    if not conv.data or conv.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    supabase.table("conversations").update({"title": title}).eq("id", conv_id).execute()
    return {"status": "ok"}


# ── Delete conversation ───────────────────────────────────────────────────

@router.delete("/conversations/{conv_id}")
@limiter.limit("10/minute")
async def delete_conversation(request: Request, conv_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")

    try:
        conv = supabase.table("conversations").select("user_id").eq("id", conv_id).execute()
    except Exception as e:
        logger.warning("Failed to delete conversation (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Chat history storage unavailable")
    if not conv.data or conv.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    supabase.table("conversations").delete().eq("id", conv_id).execute()
    return {"status": "deleted"}
