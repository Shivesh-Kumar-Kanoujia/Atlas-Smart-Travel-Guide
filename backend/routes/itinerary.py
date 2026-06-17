import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
import os
import json
from groq import AsyncGroq

from .auth import get_current_user, require_user
from .db import supabase
from .limiter import limiter

logger = logging.getLogger("atlas.itinerary")

router = APIRouter()
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))


ITINERARY_PROMPT = """You are an expert travel planner. Generate a detailed, realistic day-by-day itinerary.

Return ONLY a valid JSON array. No markdown, no explanation, just the JSON.

Each day object MUST include real geographic latitude/longitude coordinates for the main activity location in each time slot (morning, afternoon, evening) and for the accommodation.
Use coordinates that a mapping app would recognise (e.g. Eiffel Tower ≈ 48.8584, 2.2945).

Format:
[
  {{
    "day": 1,
    "date": "Day 1",
    "title": "Arrival & First Impressions",
    "theme": "Arrival & Exploration",
    "morning": {{
      "time": "09:00",
      "activity": "Activity name",
      "description": "What to do and why it's special",
      "tip": "Practical tip",
      "cost": "$10-20",
      "latitude": 48.8584,
      "longitude": 2.2945
    }},
    "afternoon": {{
      "time": "14:00",
      "activity": "Activity name",
      "description": "What to do",
      "tip": "Practical tip",
      "cost": "$5-15",
      "latitude": 48.8606,
      "longitude": 2.3376
    }},
    "evening": {{
      "time": "19:00",
      "activity": "Dinner & Evening",
      "description": "Restaurant recommendation with dish to try",
      "tip": "Reservation needed? Best table?",
      "cost": "$20-40",
      "latitude": 48.8534,
      "longitude": 2.3488
    }},
    "accommodation": "Neighbourhood to stay in and why",
    "accommodation_latitude": 48.8742,
    "accommodation_longitude": 2.3470,
    "daily_budget": "$80-120",
    "local_tip": "One thing locals know that tourists miss"
  }}
]

Trip details:
- Destination: {destination}
- Duration: {days} days
- Budget tier: {budget}
- Travel style/mood: {mood}
- Notes: {notes}

Generate exactly {days} days. Be specific — real street names, dish names, neighbourhoods, and real coordinates. No generic advice."""


class GenerateRequest(BaseModel):
    destination: str
    days: int
    budget: Optional[str] = "mid-range"
    mood: Optional[str] = "adventurous"
    notes: Optional[str] = ""
    trip_id: Optional[int] = None


@router.post("/generate")
@limiter.limit("5/minute")
async def generate_itinerary(request: Request, req: GenerateRequest):
    if req.days < 1 or req.days > 14:
        raise HTTPException(status_code=400, detail="Days must be between 1 and 14")

    prompt = ITINERARY_PROMPT.format(
        destination=req.destination,
        days=req.days,
        budget=req.budget,
        mood=req.mood,
        notes=req.notes or "No specific notes",
    )

    try:
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4000,
            temperature=0.7,
        )

        raw = completion.choices[0].message.content.strip()

        # Strip markdown code fences if model wraps in them
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        itinerary = json.loads(raw)

        # Save to trip if trip_id provided
        if req.trip_id:
            try:
                supabase.table("trips").update({"itinerary": json.dumps(itinerary)}).eq("id", req.trip_id).execute()
            except Exception as e:
                logger.warning("Failed to save itinerary to trip %s: %s", req.trip_id, e)

        return {
            "destination": req.destination,
            "days": req.days,
            "itinerary": itinerary,
            "tokens_used": completion.usage.total_tokens,
        }

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI returned invalid JSON. Try again."
        )
    except Exception as e:
        logger.exception("Itinerary generation failed")
        raise HTTPException(status_code=500, detail="Failed to generate itinerary")


@router.get("/{trip_id}")
@limiter.limit("30/minute")
async def get_trip_itinerary(request: Request, trip_id: int, user: dict = Depends(require_user)):
    user_id = user.get("id")
    result = supabase.table("trips").select("itinerary, name, destination, user_id").eq("id", trip_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Trip not found")

    row = result.data[0]
    if row.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this itinerary")
    itinerary = json.loads(row["itinerary"] or "[]")
    return {
        "trip_id": trip_id,
        "trip_name": row["name"],
        "destination": row["destination"],
        "itinerary": itinerary,
    }


@router.delete("/{trip_id}")
@limiter.limit("10/minute")
async def clear_itinerary(request: Request, trip_id: int, user: dict = Depends(require_user)):
    user_id = user.get("id")
    trip = supabase.table("trips").select("user_id").eq("id", trip_id).execute()
    if not trip.data:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.data[0].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this itinerary")
    supabase.table("trips").update({"itinerary": json.dumps([])}).eq("id", trip_id).execute()
    return {"message": "Itinerary cleared"}
