from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import json
import os
from datetime import datetime

router = APIRouter()
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "travel.db")


def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            destination TEXT NOT NULL,
            start_date TEXT,
            end_date TEXT,
            budget REAL DEFAULT 0,
            spent REAL DEFAULT 0,
            notes TEXT,
            packing_list TEXT DEFAULT '[]',
            expenses TEXT DEFAULT '[]',
            status TEXT DEFAULT 'planned',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


init_db()


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
    name: str
    destination: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = 0
    notes: Optional[str] = ""
    status: Optional[str] = "planned"


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


def row_to_dict(row):
    d = dict(row)
    d["packing_list"] = json.loads(d.get("packing_list") or "[]")
    d["expenses"] = json.loads(d.get("expenses") or "[]")
    return d


@router.get("/")
async def get_trips():
    conn = get_db()
    rows = conn.execute("SELECT * FROM trips ORDER BY created_at DESC").fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@router.get("/{trip_id}")
async def get_trip(trip_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Trip not found")
    return row_to_dict(row)


@router.post("/")
async def create_trip(trip: TripCreate):
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO trips (name, destination, start_date, end_date, budget, notes, status) VALUES (?,?,?,?,?,?,?)",
        (trip.name, trip.destination, trip.start_date, trip.end_date, trip.budget, trip.notes, trip.status),
    )
    conn.commit()
    trip_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
    conn.close()
    return row_to_dict(row)


@router.put("/{trip_id}")
async def update_trip(trip_id: int, trip: TripUpdate):
    conn = get_db()
    existing = conn.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Trip not found")

    updates = {k: v for k, v in trip.dict().items() if v is not None}
    if "packing_list" in updates:
        updates["packing_list"] = json.dumps(updates["packing_list"])
    if "expenses" in updates:
        updates["expenses"] = json.dumps(updates["expenses"])
        # Auto-calculate spent
        expenses = trip.expenses or []
        updates["spent"] = sum(e.get("amount", 0) for e in expenses)

    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        conn.execute(f"UPDATE trips SET {set_clause} WHERE id = ?", (*updates.values(), trip_id))
        conn.commit()

    row = conn.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
    conn.close()
    return row_to_dict(row)


@router.delete("/{trip_id}")
async def delete_trip(trip_id: int):
    conn = get_db()
    existing = conn.execute("SELECT id FROM trips WHERE id = ?", (trip_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Trip not found")
    conn.execute("DELETE FROM trips WHERE id = ?", (trip_id,))
    conn.commit()
    conn.close()
    return {"message": "Trip deleted successfully", "id": trip_id}


@router.post("/{trip_id}/expenses")
async def add_expense(trip_id: int, expense: ExpenseItem):
    conn = get_db()
    row = conn.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Trip not found")

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

    conn.execute(
        "UPDATE trips SET expenses = ?, spent = ? WHERE id = ?",
        (json.dumps(expenses), spent, trip_id),
    )
    conn.commit()
    conn.close()
    return new_expense


@router.post("/{trip_id}/packing")
async def update_packing_list(trip_id: int, items: List[PackingItem]):
    conn = get_db()
    existing = conn.execute("SELECT id FROM trips WHERE id = ?", (trip_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Trip not found")

    packing = [{"id": str(i + 1), "item": it.item, "packed": it.packed, "category": it.category} for i, it in enumerate(items)]
    conn.execute("UPDATE trips SET packing_list = ? WHERE id = ?", (json.dumps(packing), trip_id))
    conn.commit()
    conn.close()
    return {"packing_list": packing}
