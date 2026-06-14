from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import List, Optional
import json
from datetime import datetime

from .auth import get_current_user, require_user
from .limiter import limiter
from .db import supabase

router = APIRouter()


class ExpenseItem(BaseModel):
    id: Optional[str] = None
    category: str
    description: str
    amount: float
    date: Optional[str] = None


class PackingItem(BaseModel):
    id: Optional[str] = None
    item: str
    packed: bool = False
    category: Optional[str] = "General"


class TripCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    destination: str = Field(min_length=1, max_length=200)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = Field(default=0, ge=0)
    notes: Optional[str] = Field(default="", max_length=5000)
    status: Optional[str] = Field(default="planned", max_length=50)
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TripUpdate(BaseModel):
    name: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = None
    spent: Optional[float] = None
    notes: Optional[str] = None
    packing_list: Optional[List[dict]] = None
    expenses: Optional[List[dict]] = None
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


def row_to_dict(row):
    d = dict(row)
    d["packing_list"] = json.loads(d.get("packing_list") or "[]")
    d["expenses"] = json.loads(d.get("expenses") or "[]")
    d["itinerary"] = json.loads(d.get("itinerary") or "[]")
    return d


def verify_ownership(trip_id: int, user_id: str):
    result = supabase.table("trips").select("*").eq("id", trip_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result.data[0]


@router.get("/")
@limiter.limit("30/minute")
async def get_trips(request: Request, user=Depends(get_current_user)):
    if user:
        result = supabase.table("trips").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()
        return [row_to_dict(r) for r in result.data]
    return []


@router.get("/{trip_id}")
@limiter.limit("30/minute")
async def get_trip(request: Request, trip_id: int, user=Depends(get_current_user)):
    if user:
        result = supabase.table("trips").select("*").eq("id", trip_id).eq("user_id", user["id"]).execute()
    else:
        result = supabase.table("trips").select("*").eq("id", trip_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Trip not found")
    return row_to_dict(result.data[0])


@router.post("/")
@limiter.limit("30/minute")
async def create_trip(request: Request, trip: TripCreate, user=Depends(require_user)):
    result = supabase.table("trips").insert({
        "user_id": user["id"],
        "name": trip.name,
        "destination": trip.destination,
        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "budget": trip.budget,
        "notes": trip.notes,
        "status": trip.status,
        "latitude": trip.latitude,
        "longitude": trip.longitude,
    }).execute()
    return row_to_dict(result.data[0])


@router.put("/{trip_id}")
@limiter.limit("30/minute")
async def update_trip(request: Request, trip_id: int, trip: TripUpdate, user=Depends(require_user)):
    verify_ownership(trip_id, user["id"])

    updates = {k: v for k, v in trip.model_dump().items() if v is not None}
    if "packing_list" in updates:
        updates["packing_list"] = json.dumps(updates["packing_list"])
    if "expenses" in updates:
        updates["expenses"] = json.dumps(updates["expenses"])
        expenses = trip.expenses or []
        updates["spent"] = sum(e.get("amount", 0) for e in expenses)

    if updates:
        supabase.table("trips").update(updates).eq("id", trip_id).execute()

    result = supabase.table("trips").select("*").eq("id", trip_id).execute()
    return row_to_dict(result.data[0])


@router.delete("/{trip_id}")
@limiter.limit("10/minute")
async def delete_trip(request: Request, trip_id: int, user=Depends(require_user)):
    verify_ownership(trip_id, user["id"])
    supabase.table("trips").delete().eq("id", trip_id).eq("user_id", user["id"]).execute()
    return {"message": "Trip deleted successfully", "id": trip_id}


@router.post("/{trip_id}/expenses")
@limiter.limit("30/minute")
async def add_expense(request: Request, trip_id: int, expense: ExpenseItem, user=Depends(require_user)):
    result = supabase.table("trips").select("*").eq("id", trip_id).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Trip not found")
    row = result.data[0]

    expenses = json.loads(row["expenses"] or "[]")
    new_expense = {
        "id": str(len(expenses) + 1),
        "category": expense.category,
        "description": expense.description,
        "amount": expense.amount,
        "date": expense.date or datetime.now().strftime("%Y-%m-%d"),
    }
    expenses.append(new_expense)
    spent = sum(e["amount"] for e in expenses)

    supabase.table("trips").update({
        "expenses": json.dumps(expenses),
        "spent": spent,
    }).eq("id", trip_id).execute()

    return new_expense


@router.post("/{trip_id}/packing")
@limiter.limit("30/minute")
async def update_packing_list(request: Request, trip_id: int, items: List[PackingItem], user=Depends(require_user)):
    verify_ownership(trip_id, user["id"])
    packing = [{"id": str(i + 1), "item": it.item, "packed": it.packed, "category": it.category} for i, it in enumerate(items)]
    supabase.table("trips").update({"packing_list": json.dumps(packing)}).eq("id", trip_id).execute()
    return {"packing_list": packing}
