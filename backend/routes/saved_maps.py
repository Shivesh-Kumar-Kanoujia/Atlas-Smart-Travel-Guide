import json
import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from .auth import get_current_user
from .db import supabase
from .limiter import limiter

logger = logging.getLogger("atlas.saved_maps")

router = APIRouter()


class SaveMapRequest(BaseModel):
    trip_id: Optional[int] = None
    name: str = Field(default="My Map", max_length=200)
    map_state: dict = {}


class UpdateMapRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    map_state: Optional[dict] = None


def _require_user(user):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user["id"]


@router.get("/")
@limiter.limit("30/minute")
async def list_saved_maps(
    request: Request,
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    if not user:
        return {"maps": []}
    uid = user["id"]
    limit = max(1, min(limit, 500))
    try:
        result = supabase.table("saved_map_views") \
            .select("id, name, trip_id, created_at, updated_at") \
            .eq("user_id", uid) \
            .order("updated_at", desc=True) \
            .limit(limit) \
            .execute()
        return {"maps": result.data or []}
    except Exception as e:
        logger.warning("Failed to list saved maps (table may not exist): %s", e)
        return {"maps": []}


@router.post("/")
@limiter.limit("20/minute")
async def save_map(request: Request, req: SaveMapRequest, user: dict = Depends(get_current_user)):
    uid = _require_user(user)
    now = datetime.utcnow().isoformat()
    data = {
        "user_id": uid,
        "trip_id": req.trip_id,
        "name": req.name,
        "map_state": json.dumps(req.map_state),
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = supabase.table("saved_map_views").insert(data).execute()
    except Exception as e:
        logger.warning("Failed to save map (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Map save storage unavailable")
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save map")
    return {"map": result.data[0], "message": "Map saved"}


@router.get("/{map_id}")
@limiter.limit("30/minute")
async def get_saved_map(request: Request, map_id: int, user: dict = Depends(get_current_user)):
    uid = _require_user(user)
    try:
        result = supabase.table("saved_map_views") \
            .select("*") \
            .eq("id", map_id) \
            .eq("user_id", uid) \
            .execute()
    except Exception as e:
        logger.warning("Failed to get saved map (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Map retrieval unavailable")
    if not result.data:
        raise HTTPException(status_code=404, detail="Map not found")
    row = result.data[0]
    row["map_state"] = json.loads(row.get("map_state", "{}"))
    return {"map": row}


@router.put("/{map_id}")
@limiter.limit("20/minute")
async def update_saved_map(
    request: Request, map_id: int, req: UpdateMapRequest, user: dict = Depends(get_current_user)
):
    uid = _require_user(user)
    updates = {"updated_at": datetime.utcnow().isoformat()}
    if req.name is not None:
        updates["name"] = req.name
    if req.map_state is not None:
        updates["map_state"] = json.dumps(req.map_state)

    try:
        result = supabase.table("saved_map_views") \
            .update(updates) \
            .eq("id", map_id) \
            .eq("user_id", uid) \
            .execute()
    except Exception as e:
        logger.warning("Failed to update saved map (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Map update storage unavailable")
    if not result.data:
        raise HTTPException(status_code=404, detail="Map not found or not yours")
    return {"map": result.data[0], "message": "Map updated"}


@router.delete("/{map_id}")
@limiter.limit("20/minute")
async def delete_saved_map(request: Request, map_id: int, user: dict = Depends(get_current_user)):
    uid = _require_user(user)
    try:
        result = supabase.table("saved_map_views") \
            .delete() \
            .eq("id", map_id) \
            .eq("user_id", uid) \
            .execute()
    except Exception as e:
        logger.warning("Failed to delete saved map (table may not exist): %s", e)
        raise HTTPException(status_code=500, detail="Map deletion unavailable")
    if not result.data:
        raise HTTPException(status_code=404, detail="Map not found or not yours")
    return {"message": "Map deleted"}
