from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import json
import sqlite3
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "travel.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_itinerary_column():
    conn = get_db()
    try:
        conn.execute("ALTER TABLE trips ADD COLUMN itinerary TEXT DEFAULT '[]'")
        conn.commit()
    except Exception:
        pass
    conn.close()


ensure_itinerary_column()


ITINERARY_PROMPT = """You are an expert travel planner. Generate a detailed, realistic day-by-day itinerary.

Return ONLY a valid JSON array. No markdown, no explanation, just the JSON.

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
      "cost": "$10-20"
    }},
    "afternoon": {{
      "time": "14:00",
      "activity": "Activity name",
      "description": "What to do",
      "tip": "Practical tip",
      "cost": "$5-15"
    }},
    "evening": {{
      "time": "19:00",
      "activity": "Dinner & Evening",
      "description": "Restaurant recommendation with dish to try",
      "tip": "Reservation needed? Best table?",
      "cost": "$20-40"
    }},
    "accommodation": "Neighbourhood to stay in and why",
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

Generate exactly {days} days. Be specific — real street names, dish names, neighbourhoods. No generic advice."""


class GenerateRequest(BaseModel):
    destination: str
    days: int
    budget: Optional[str] = "mid-range"
    mood: Optional[str] = "adventurous"
    notes: Optional[str] = ""
    trip_id: Optional[int] = None


@router.post("/generate")
async def generate_itinerary(req: GenerateRequest):
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
        completion = client.chat.completions.create(
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
                conn = get_db()
                conn.execute(
                    "UPDATE trips SET itinerary = ? WHERE id = ?",
                    (json.dumps(itinerary), req.trip_id)
                )
                conn.commit()
                conn.close()
            except Exception:
                pass

        return {
            "destination": req.destination,
            "days": req.days,
            "itinerary": itinerary,
            "tokens_used": completion.usage.total_tokens,
        }

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI returned invalid JSON. Try again. Error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{trip_id}")
async def get_trip_itinerary(trip_id: int):
    conn = get_db()
    row = conn.execute("SELECT itinerary, name, destination FROM trips WHERE id = ?", (trip_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Trip not found")

    itinerary = json.loads(row["itinerary"] or "[]")
    return {
        "trip_id": trip_id,
        "trip_name": row["name"],
        "destination": row["destination"],
        "itinerary": itinerary,
    }


@router.delete("/{trip_id}")
async def clear_itinerary(trip_id: int):
    conn = get_db()
    conn.execute("UPDATE trips SET itinerary = '[]' WHERE id = ?", (trip_id,))
    conn.commit()
    conn.close()
    return {"message": "Itinerary cleared"}
