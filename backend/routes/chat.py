from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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


def build_messages(request: ChatRequest):
    context = f"\nUser mood: {request.mood} | Budget tier: {request.budget}"
    if request.destination:
        context += f" | Destination: {request.destination}"
    if request.memory:
        context += f"\n\nUser travel profile (remember this):\n{request.memory}"

    messages = [{"role": "system", "content": SYSTEM_PROMPT + context}]
    messages += [{"role": m.role, "content": m.content} for m in request.messages]
    return messages


# Streaming endpoint - SSE
@router.post("/stream")
async def chat_stream(request: ChatRequest):
    try:
        messages = build_messages(request)

        def generate():
            try:
                stream = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    max_tokens=1024,
                    temperature=0.7,
                    stream=True,
                )
                for chunk in stream:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        payload = json.dumps({"token": delta.content})
                        yield f"data: {payload}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Non-streaming fallback
@router.post("/")
async def chat(request: ChatRequest):
    try:
        messages = build_messages(request)
        completion = client.chat.completions.create(
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
        raise HTTPException(status_code=500, detail=str(e))
