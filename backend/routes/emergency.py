import logging
from fastapi import APIRouter, HTTPException, Query, Request
from groq import AsyncGroq
import os
from .limiter import limiter

logger = logging.getLogger("atlas.emergency")

router = APIRouter()
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

EMERGENCY_NUMBERS = {
    "US": {"police": "911", "ambulance": "911", "fire": "911", "tourist_helpline": "1-800-TRAVUSA"},
    "UK": {"police": "999", "ambulance": "999", "fire": "999", "non_emergency": "101"},
    "EU": {"emergency": "112", "note": "112 works across all EU countries"},
    "IN": {"police": "100", "ambulance": "102", "fire": "101", "tourist": "1800-111-363"},
    "JP": {"police": "110", "ambulance": "119", "fire": "119"},
    "AU": {"emergency": "000", "non_emergency": "131 444"},
    "TH": {"tourist_police": "1155", "emergency": "191"},
    "FR": {"police": "17", "ambulance": "15", "fire": "18", "eu_emergency": "112"},
    "DE": {"police": "110", "ambulance": "112", "fire": "112"},
    "IT": {"police": "113", "ambulance": "118", "fire": "115", "eu_emergency": "112"},
    "ES": {"police": "091", "ambulance": "061", "fire": "080", "eu_emergency": "112"},
    "SG": {"police": "999", "ambulance": "995", "fire": "995"},
}


@router.get("/numbers")
@limiter.limit("30/minute")
async def get_emergency_numbers(request: Request, country_code: str = Query(..., description="ISO country code e.g. US, UK, IN")):
    code = country_code.upper()
    data = EMERGENCY_NUMBERS.get(code)
    if not data:
        return {"country": code, "note": "Specific numbers not available. Try 112 (international emergency).", "universal": "112"}
    return {"country": code, "numbers": data}


@router.get("/info")
@limiter.limit("10/minute")
async def get_emergency_info(request: Request, destination: str = Query(...)):
    try:
        prompt = f"""Provide essential emergency and safety information for travelers visiting {destination}.
Include:
1. Emergency phone numbers (police, ambulance, fire)
2. Nearest embassy/consulate contact process
3. Common scams to avoid
4. Medical/health precautions
5. Travel insurance advice
6. Local laws travelers often unknowingly break
7. 24/7 tourist helpline if available
Be concise and practical."""

        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=700,
        )
        return {
            "destination": destination,
            "info": completion.choices[0].message.content,
        }
    except Exception as e:
        logger.exception("Emergency info fetch failed")
        raise HTTPException(status_code=500, detail="Failed to fetch emergency information")
