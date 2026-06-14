import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import os
import json
from groq import AsyncGroq
from .limiter import limiter

logger = logging.getLogger("atlas.planning")

router = APIRouter()
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))


# ── Budget Estimation ──────────────────────────────────────────────────────

BUDGET_PROMPT = """You are an expert travel budget planner. Estimate the total trip cost for a traveler.

Return ONLY a valid JSON object. No markdown, no explanation.

Format:
{{
  "destination": "{destination}",
  "duration_days": {days},
  "travelers": {travelers},
  "currency": "USD",
  "estimated_total": 1500,
  "breakdown": {{
    "accommodation": {{ "amount": 600, "details": "Budget hotel/hostel at $50-80/night", "tier": "budget" }},
    "flights_transport": {{ "amount": 400, "details": "Round-trip flights + local transport", "tier": "mid" }},
    "food": {{ "amount": 250, "details": "Mix of local eateries and mid-range restaurants", "tier": "budget" }},
    "activities": {{ "amount": 150, "details": "Museums, tours, attractions", "tier": "mid" }},
    "miscellaneous": {{ "amount": 100, "details": "Souvenirs, tips, unexpected costs", "tier": "low" }}
  }},
  "daily_per_person": 50,
  "tip": "Visit local markets for affordable meals and free walking tours to save money.",
  "budget_tier": "{budget}"
}}

Trip details:
- Destination: {destination}
- Duration: {days} days
- Travelers: {travelers}
- Budget tier: {budget}
- Travel style/mood: {mood}
- Notes: {notes}

Be realistic with prices. Base estimates on the destination's actual cost of living."""


class BudgetRequest(BaseModel):
    destination: str
    days: int = 5
    travelers: int = 1
    budget: str = "mid-range"
    mood: str = "adventurous"
    notes: str = ""


class PackingRequest(BaseModel):
    destination: str
    days: int = 5
    budget: str = "mid-range"
    activities: str = "General sightseeing"
    season: str = "summer"
    notes: str = ""


@router.post("/budget-estimate")
@limiter.limit("5/minute")
async def estimate_budget(request: Request, req: BudgetRequest):
    if req.days < 1 or req.days > 90:
        raise HTTPException(status_code=400, detail="Days must be between 1 and 90")
    if req.travelers < 1 or req.travelers > 20:
        raise HTTPException(status_code=400, detail="Travelers must be between 1 and 20")

    prompt = BUDGET_PROMPT.format(
        destination=req.destination,
        days=req.days,
        travelers=req.travelers,
        budget=req.budget,
        mood=req.mood,
        notes=req.notes or "No specific notes",
    )

    try:
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.7,
        )

        raw = completion.choices[0].message.content.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        estimate = json.loads(raw)
        return estimate

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON. Try again.")
    except Exception as e:
        logger.exception("Itinerary generation failed")
        raise HTTPException(status_code=500, detail="Failed to generate itinerary")


# ── Packing Assistant ──────────────────────────────────────────────────────

PACKING_PROMPT = """You are an expert packing advisor. Generate a comprehensive but realistic packing list for a trip.

Return ONLY a valid JSON object. No markdown, no explanation.

Format:
{{
  "destination": "{destination}",
  "duration_days": {days},
  "season": "{season}",
  "categories": [
    {{
      "name": "Clothing",
      "items": [
        {{ "item": "T-shirts (4-5)", "essential": true, "tip": "Light, breathable fabrics" }},
        {{ "item": "Jeans / pants (2)", "essential": true, "tip": "Comfortable for long walks" }}
      ]
    }},
    {{
      "name": "Toiletries",
      "items": [
        {{ "item": "Sunscreen SPF 50+", "essential": true, "tip": "Essential for {season} travel" }}
      ]
    }},
    {{
      "name": "Electronics",
      "items": [
        {{ "item": "Universal power adapter", "essential": true, "tip": "Check plug types for {destination}" }}
      ]
    }},
    {{
      "name": "Documents",
      "items": [
        {{ "item": "Passport (check validity)", "essential": true, "tip": "Must have 6+ months remaining" }}
      ]
    }},
    {{
      "name": "Health & Safety",
      "items": [
        {{ "item": "Basic first aid kit", "essential": true, "tip": "Include band-aids, antiseptic, pain relievers" }}
      ]
    }}
  ],
  "total_items": 30,
  "essential_count": 20,
  "luggage_tip": "Pack light — you'll thank yourself later!",
  "destination_tip": "Check local customs regarding dress code before packing."
}}

Trip details:
- Destination: {destination}
- Duration: {days} days
- Season: {season}
- Budget tier: {budget}
- Planned activities: {activities}
- Notes: {notes}

Tailor the list to the destination's climate, culture, and the activities planned."""


class PackingSuggestRequest(BaseModel):
    destination: str
    days: int = 5
    budget: str = "mid-range"
    activities: str = "General sightseeing"
    season: str = "summer"
    notes: str = ""


@router.post("/packing-suggest")
@limiter.limit("5/minute")
async def suggest_packing(request: Request, req: PackingSuggestRequest):
    if req.days < 1 or req.days > 90:
        raise HTTPException(status_code=400, detail="Days must be between 1 and 90")

    prompt = PACKING_PROMPT.format(
        destination=req.destination,
        days=req.days,
        season=req.season,
        budget=req.budget,
        activities=req.activities or "General sightseeing",
        notes=req.notes or "No specific notes",
    )

    try:
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
            temperature=0.7,
        )

        raw = completion.choices[0].message.content.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        packing = json.loads(raw)
        return packing

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON. Try again.")
    except Exception as e:
        logger.exception("Packing list generation failed")
        raise HTTPException(status_code=500, detail="Failed to generate packing list")
