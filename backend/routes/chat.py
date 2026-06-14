import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import re
from groq import AsyncGroq
from .limiter import limiter

logger = logging.getLogger("atlas.chat")

router = APIRouter()
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are Atlas, an expert AI travel guide with deep knowledge of destinations worldwide.

Your capabilities:
- Give mood-based travel recommendations (adventurous, romantic, relaxing, cultural, etc.)
- Provide budget-aware suggestions (backpacker, mid-range, luxury)
- Suggest itineraries with day-by-day breakdowns
- Offer safety tips, visa info, best travel seasons
- Recommend local food, hidden gems, and off-the-beaten-path experiences

Response style:
- Be warm, enthusiastic, and knowledgeable
- Use markdown: **bold** for highlights, bullet points for lists, ## for sections
- Always consider the traveler's budget and preferences

When giving recommendations always mention:
1. Why this destination suits their mood/budget
2. Top 3 must-do activities  
3. Estimated daily budget range
4. Best time to visit
5. One insider tip most tourists miss
"""


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    mood: Optional[str] = "adventurous"
    budget: Optional[str] = "mid-range"
    destination: Optional[str] = None
    user_id: Optional[str] = None
    memory: Optional[str] = None


def sanitize(val: str, max_len: int = 2000) -> str:
    if not val:
        return ""
    val = val.strip()[:max_len]
    val = re.sub(r"<[^>]*>", "", val)
    return val


def build_messages(request: ChatRequest):
    context = f"\nUser mood: {sanitize(request.mood, 50)} | Budget tier: {sanitize(request.budget, 50)}"
    if request.destination:
        context += f" | Destination: {sanitize(request.destination, 200)}"
    if request.memory:
        context += f"\n\nUser travel profile (remember this):\n{sanitize(request.memory, 2000)}"

    # Inject structured preferences if user is logged in
    if request.user_id:
        try:
            from .db import supabase
            prefs_result = supabase.table("user_preferences").select("*").eq("user_id", request.user_id).execute()
            if prefs_result.data:
                p = prefs_result.data[0]
                prefs_lines = []
                if p.get("preferred_moods"):
                    import json
                    moods = json.loads(p["preferred_moods"]) if isinstance(p["preferred_moods"], str) else p["preferred_moods"]
                    prefs_lines.append(f"Preferred moods: {', '.join(moods)}")
                if p.get("preferred_budget"):
                    prefs_lines.append(f"Budget preference: {p['preferred_budget']}")
                if p.get("pace"):
                    prefs_lines.append(f"Travel pace: {p['pace']}")
                if p.get("interests"):
                    import json
                    interests = json.loads(p["interests"]) if isinstance(p["interests"], str) else p["interests"]
                    prefs_lines.append(f"Interests: {', '.join(interests)}")
                if p.get("travel_style"):
                    prefs_lines.append(f"Travel style: {p['travel_style']}")
                if p.get("dietary_preferences"):
                    prefs_lines.append(f"Dietary: {p['dietary_preferences']}")
                if prefs_lines:
                    context += "\n\nStructured user preferences:\n" + "\n".join(prefs_lines)
        except Exception as e:
            logger.warning("Failed to load user preferences for chat context: %s", e)

    messages = [{"role": "system", "content": SYSTEM_PROMPT + context}]
    for m in request.messages:
        if m.role and m.content:
            messages.append({"role": m.role, "content": sanitize(m.content, 4000)})
    return messages


# Streaming endpoint - SSE
@router.post("/stream")
@limiter.limit("10/minute")
async def chat_stream(body: ChatRequest, request: Request):
    messages = build_messages(body)

    async def generate():
        try:
            stream = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                max_tokens=1024,
                temperature=0.7,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    payload = json.dumps({"token": delta.content})
                    yield f"data: {payload}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            logger.exception("Chat stream error")
            yield f"data: {json.dumps({'error': 'AI service error, please try again'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# Non-streaming fallback
@router.post("/")
@limiter.limit("10/minute")
async def chat(body: ChatRequest, request: Request):
    try:
        messages = build_messages(body)
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
        )
        return {
            "response": completion.choices[0].message.content,
            "tokens_used": completion.usage.total_tokens,
        }
    except Exception as e:
        logger.exception("Chat error")
        raise HTTPException(status_code=500, detail="AI service error")
