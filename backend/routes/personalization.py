import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
import os
import json
import re
from groq import AsyncGroq
from .auth import get_current_user, require_user
from .db import supabase
from .limiter import limiter

logger = logging.getLogger("atlas.personalization")

router = APIRouter()
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))


# ── Extract preferences from chat history ─────────────────────────────────

EXTRACT_PROMPT = """You are a travel preference analyst. Analyze the following conversation history and trip data to extract the traveler's preferences.

Return ONLY a valid JSON object. No markdown, no explanation.

Format:
{
  "preferred_moods": ["adventurous", "cultural"],
  "preferred_budget": "mid-range",
  "favorite_destinations": ["Japan", "Italy"],
  "bucket_list": ["Safari in Kenya", "Northern Lights"],
  "travel_style": "Immersive cultural experiences with a mix of adventure and relaxation",
  "interests": ["Food", "History", "Photography", "Hiking"],
  "dietary_preferences": "Loves local cuisine, no restrictions",
  "accommodation_preference": "Boutique hotels, hostels for socializing",
  "pace": "moderate",
  "past_trips_summary": "Has traveled to Southeast Asia and Europe",
  "summary": "A concise 2-3 sentence profile of this traveler"
}

Conversation History:
{chat_history}

Trip Data:
{trip_data}

If there isn't enough information to determine a preference, use sensible defaults."""


class ExtractPreferencesRequest(BaseModel):
    chat_history: Optional[str] = ""
    trip_data: Optional[str] = ""


class UpdatePreferencesRequest(BaseModel):
    preferred_moods: List[str] = ["adventurous"]
    preferred_budget: str = "mid-range"
    favorite_destinations: List[str] = []
    bucket_list: List[str] = []
    travel_style: str = ""
    interests: List[str] = []
    dietary_preferences: str = ""
    accommodation_preference: str = ""
    pace: str = "moderate"


@router.post("/extract-preferences")
@limiter.limit("3/minute")
async def extract_preferences(request: Request, req: ExtractPreferencesRequest, user: dict = Depends(get_current_user)):
    """Use AI to analyze chat history and trip data, then update user preferences."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    user_id = user.get("id")

    if not req.chat_history and not req.trip_data:
        # Try to get existing data
        try:
            # Get recent conversations
            convs = supabase.table("conversations").select("id").eq("user_id", user_id).order("updated_at", desc=True).limit(5).execute()
            chat_parts = []
            for conv in (convs.data or []):
                msgs = supabase.table("messages").select("role,content").eq("conversation_id", conv["id"]).order("created_at", asc=True).limit(10).execute()
                for m in (msgs.data or []):
                    chat_parts.append(f"{m['role']}: {m['content'][:300]}")
            req.chat_history = "\n".join(chat_parts[:30])

            # Get recent trips
            trips = supabase.table("trips").select("name,destination,status,budget,spent,notes").eq("user_id", user_id).limit(10).execute()
            trip_lines = []
            for t in (trips.data or []):
                trip_lines.append(f"- {t.get('name')} to {t.get('destination')} ({t.get('status')}, budget ${t.get('budget',0)})")
            req.trip_data = "\n".join(trip_lines)
        except Exception as e:
            logger.warning(f"Failed to fetch user data for extraction: {e}")

    prompt = EXTRACT_PROMPT.format(
        chat_history=req.chat_history or "No chat history available.",
        trip_data=req.trip_data or "No trip data available.",
    )

    try:
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
            temperature=0.5,
        )

        raw = completion.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        preferences = json.loads(raw)

        # Extract a summary for travel_memory
        summary_parts = []
        if preferences.get("summary"):
            summary_parts.append(preferences["summary"])
        if preferences.get("preferred_moods"):
            summary_parts.append(f"Preferred travel styles: {', '.join(preferences['preferred_moods'])}")
        if preferences.get("preferred_budget"):
            summary_parts.append(f"Budget preference: {preferences['preferred_budget']}")
        if preferences.get("interests"):
            summary_parts.append(f"Interests: {', '.join(preferences['interests'])}")
        if preferences.get("travel_style"):
            summary_parts.append(f"Travel style: {preferences['travel_style']}")
        if preferences.get("bucket_list"):
            summary_parts.append(f"Bucket list: {', '.join(preferences['bucket_list'])}")

        travel_memory = "\n".join(summary_parts)

        # Save to user profile
        supabase.table("users").update({"travel_memory": travel_memory[:2000]}).eq("id", user_id).execute()

        # Save structured preferences
        try:
            existing = supabase.table("user_preferences").select("id").eq("user_id", user_id).execute()
            prefs_data = {
                "user_id": user_id,
                "preferred_moods": json.dumps(preferences.get("preferred_moods", [])),
                "preferred_budget": preferences.get("preferred_budget", "mid-range"),
                "favorite_destinations": json.dumps(preferences.get("favorite_destinations", [])),
                "bucket_list": json.dumps(preferences.get("bucket_list", [])),
                "travel_style": preferences.get("travel_style", ""),
                "interests": json.dumps(preferences.get("interests", [])),
                "dietary_preferences": preferences.get("dietary_preferences", ""),
                "accommodation_preference": preferences.get("accommodation_preference", ""),
                "pace": preferences.get("pace", "moderate"),
            }

            if existing.data:
                supabase.table("user_preferences").update(prefs_data).eq("user_id", user_id).execute()
            else:
                supabase.table("user_preferences").insert(prefs_data).execute()
        except Exception as e:
            logger.warning("Failed to save preferences (table may not exist): %s", e)

        return {"preferences": preferences, "travel_memory": travel_memory}

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")
    except Exception as e:
        logger.exception("Personalization optimization failed")
        raise HTTPException(status_code=500, detail="Failed to optimize preferences")


# ── Get user preferences ──────────────────────────────────────────────────

@router.get("/preferences")
@limiter.limit("30/minute")
async def get_preferences(request: Request, user: dict = Depends(require_user)):
    user_id = user.get("id")

    try:
        result = supabase.table("user_preferences").select("*").eq("user_id", user_id).execute()
        if result.data:
            prefs = result.data[0]
            # Parse JSON fields
            for field in ["preferred_moods", "favorite_destinations", "bucket_list", "interests"]:
                val = prefs.get(field)
                if isinstance(val, str):
                    try:
                        prefs[field] = json.loads(val)
                    except (json.JSONDecodeError, TypeError):
                        prefs[field] = []
            return prefs
    except Exception as e:
        logger.warning("Failed to get preferences (table may not exist): %s", e)

    return {
        "preferred_moods": ["adventurous"],
        "preferred_budget": "mid-range",
        "favorite_destinations": [],
        "bucket_list": [],
        "travel_style": "",
        "interests": [],
        "dietary_preferences": "",
        "accommodation_preference": "",
        "pace": "moderate",
    }


# ── Update preferences manually ───────────────────────────────────────────

@router.put("/preferences")
@limiter.limit("10/minute")
async def update_preferences(request: Request, req: UpdatePreferencesRequest, user: dict = Depends(require_user)):
    user_id = user.get("id")

    data = {
        "preferred_moods": json.dumps(req.preferred_moods),
        "preferred_budget": req.preferred_budget,
        "favorite_destinations": json.dumps(req.favorite_destinations),
        "bucket_list": json.dumps(req.bucket_list),
        "travel_style": req.travel_style,
        "interests": json.dumps(req.interests),
        "dietary_preferences": req.dietary_preferences,
        "accommodation_preference": req.accommodation_preference,
        "pace": req.pace,
    }

    try:
        existing = supabase.table("user_preferences").select("id").eq("user_id", user_id).execute()
        if existing.data:
            supabase.table("user_preferences").update(data).eq("user_id", user_id).execute()
        else:
            data["user_id"] = user_id
            supabase.table("user_preferences").insert(data).execute()
    except Exception as e:
        logger.warning("Failed to update preferences (table may not exist): %s", e)

    return {"status": "ok"}


# ── Personalized recommendations ──────────────────────────────────────────

RECOMMEND_PROMPT = """You are a personalized travel recommendation engine. Based on the user's profile, suggest 3 destinations they would love.

Return ONLY a valid JSON array. No markdown, no explanation.

Format:
[
  {{
    "destination": "Kyoto, Japan",
    "why_it_matches": "You love cultural experiences and Japanese food",
    "best_time_to_visit": "March-May or October-November",
    "estimated_budget_per_day": "$80-120",
    "highlights": ["Fushimi Inari Shrine", "Bamboo Grove", "Traditional tea ceremony"],
    "match_score": 95
  }}
]

User Profile:
{user_profile}

Current date: The upcoming travel season.
Be specific with destinations and match reasons."""


@router.get("/recommendations")
@limiter.limit("5/minute")
async def get_recommendations(request: Request, user: dict = Depends(get_current_user)):
    # Handle unauthenticated or None user gracefully
    if not user:
        user_id = None
        user_name = "Traveler"
    else:
        user_id = user.get("id")
        user_name = user.get("name", "Traveler")

    # Build user profile from preferences and memory
    profile_parts = [f"Name: {user_name}"]

    # Get structured preferences
    if user_id:
        try:
            prefs_result = supabase.table("user_preferences").select("*").eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning("Failed to query user_preferences (table may not exist): %s", e)
            prefs_result = type('obj', (object,), {'data': []})()
        if prefs_result.data:
            prefs = prefs_result.data[0]

            def parse_list(val):
                if isinstance(val, str):
                    try:
                        parsed = json.loads(val)
                        return ', '.join(parsed) if isinstance(parsed, list) else val
                    except (json.JSONDecodeError, TypeError):
                        return val
                if isinstance(val, list):
                    return ', '.join(val)
                return str(val) if val else ''

            profile_parts.append(f"Preferred moods: {parse_list(prefs.get('preferred_moods'))}")
            profile_parts.append(f"Budget: {prefs.get('preferred_budget', 'mid-range')}")
            profile_parts.append(f"Interests: {parse_list(prefs.get('interests'))}")
            profile_parts.append(f"Travel style: {prefs.get('travel_style', 'Not specified')}")
            profile_parts.append(f"Pace: {prefs.get('pace', 'moderate')}")
            profile_parts.append(f"Favorite destinations: {parse_list(prefs.get('favorite_destinations'))}")
            profile_parts.append(f"Bucket list: {parse_list(prefs.get('bucket_list'))}")

        # Add travel memory
        if user and user.get("travel_memory"):
            profile_parts.append(f"\nTravel memory: {user['travel_memory']}")

    user_profile = "\n".join(profile_parts)

    prompt = RECOMMEND_PROMPT.format(user_profile=user_profile)

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

        recommendations = json.loads(raw)
        return {"recommendations": recommendations}

    except json.JSONDecodeError:
        raw_preview = raw[:200] if 'raw' in locals() else 'N/A'
        logger.error("AI returned invalid JSON. Raw preview: %s", raw_preview)
        raise HTTPException(status_code=500, detail="AI returned an invalid response format. Please try again.")
    except Exception as e:
        logger.exception("Recommendation generation failed: %s", e)
        err_msg = str(e).lower()
        if "rate_limit" in err_msg or "quota" in err_msg or "429" in err_msg:
            raise HTTPException(status_code=429, detail="AI service is temporarily rate-limited. Please try again in a minute.")
        if "api key" in err_msg or "unauthorized" in err_msg or "auth" in err_msg:
            raise HTTPException(status_code=503, detail="AI service configuration error. Contact support.")
        if "connection" in err_msg or "timeout" in err_msg or "network" in err_msg:
            raise HTTPException(status_code=503, detail="AI service connection failed. Please try again.")
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {err_msg[:200]}")
