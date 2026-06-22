import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
import json
import secrets
from datetime import datetime, timezone, timedelta
from .auth import get_current_user
from .db import supabase
from .limiter import limiter

logger = logging.getLogger("atlas.share")

router = APIRouter()


class ShareCreate(BaseModel):
    trip_id: int
    expires_in_days: Optional[int] = 7


@router.post("/trips")
@limiter.limit("10/minute")
async def create_share_link(request: Request, req: ShareCreate, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    user_id = user.get("id")

    try:
        result = supabase.table("trips").select("*").eq("id", req.trip_id).execute()
    except Exception as e:
        logger.warning("Failed to query trips (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Trip sharing storage unavailable")
    if not result.data:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip = result.data[0]
    if trip["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your trip")

    try:
        existing = supabase.table("shared_trips").select("code").eq("trip_id", req.trip_id).execute()
    except Exception as e:
        logger.warning("Failed to query shared_trips (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Sharing storage unavailable")
    if existing.data:
        return {"code": existing.data[0]["code"], "existing": True}

    code = secrets.token_urlsafe(8)
    now = datetime.now(timezone.utc).isoformat()
    expires_at = None
    if req.expires_in_days and req.expires_in_days > 0:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=req.expires_in_days)).isoformat()

    share_data = {
        "code": code,
        "trip_id": req.trip_id,
        "user_id": user_id,
        "created_at": now,
        "expires_at": expires_at,
    }

    try:
        supabase.table("shared_trips").insert(share_data).execute()
    except Exception as e:
        logger.warning("Failed to insert shared_trip (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Sharing storage unavailable")
    return {"code": code, "existing": False}


@router.get("/trips/{code}")
@limiter.limit("30/minute")
async def get_shared_trip(request: Request, code: str):
    try:
        result = supabase.table("shared_trips").select("*").eq("code", code).execute()
    except Exception as e:
        logger.warning("Failed to query shared_trips (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Sharing storage unavailable")
    if not result.data:
        raise HTTPException(status_code=404, detail="Share link not found or expired")

    share = result.data[0]

    # Check expiry
    if share.get("expires_at"):
        expires = share["expires_at"]
        if isinstance(expires, str):
            expires_dt = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if expires_dt < datetime.now(timezone.utc):
                raise HTTPException(status_code=410, detail="Share link has expired")

    try:
        trip_result = supabase.table("trips").select("*").eq("id", share["trip_id"]).execute()
    except Exception as e:
        logger.warning("Failed to query trip (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Trip retrieval unavailable")
    if not trip_result.data:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip = trip_result.data[0]
    trip["itinerary"] = json.loads(trip.get("itinerary") or "[]")
    trip["expenses"] = json.loads(trip.get("expenses") or "[]")
    trip["packing_list"] = json.loads(trip.get("packing_list") or "[]")

    try:
        user_result = supabase.table("users").select("name").eq("id", trip["user_id"]).execute()
        sharer_name = user_result.data[0]["name"] if user_result.data else "A traveler"
    except Exception as e:
        logger.warning("Failed to query user for sharing: %s", e)
        sharer_name = "A traveler"

    return {
        "trip": trip,
        "sharer": sharer_name,
        "shared_at": share["created_at"],
    }
