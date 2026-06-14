import logging
from fastapi import APIRouter, Depends, Request
from .auth import get_current_user
from .db import supabase
from .limiter import limiter
import json

logger = logging.getLogger("atlas.analytics")

router = APIRouter()


@router.get("/overview")
@limiter.limit("20/minute")
async def get_analytics_overview(request: Request, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    if not user_id:
        return {"error": "Authentication required"}

    try:
        result = supabase.table("trips").select("*").eq("user_id", user_id).execute()
    except Exception as e:
        logger.exception("Analytics query failed for user %s", user_id)
        return {"error": "Failed to load analytics", "trips_count": 0}

    trips = result.data or []
    total_budget = 0
    total_spent = 0
    status_counts = {}
    expense_categories = {}
    destinations = []
    monthly_spending = {}

    for trip in trips:
        total_budget += trip.get("budget", 0) or 0
        total_spent += trip.get("spent", 0) or 0

        status = trip.get("status", "planned")
        status_counts[status] = status_counts.get(status, 0) + 1

        destinations.append({
            "name": trip.get("destination", "Unknown"),
            "budget": trip.get("budget", 0) or 0,
            "spent": trip.get("spent", 0) or 0,
        })

        # Parse expenses
        expenses_raw = trip.get("expenses", "[]")
        try:
            expenses = json.loads(expenses_raw) if isinstance(expenses_raw, str) else (expenses_raw or [])
        except (json.JSONDecodeError, TypeError):
            expenses = []

        for ex in expenses:
            cat = ex.get("category", "Other")
            amount = ex.get("amount", 0) or 0
            expense_categories[cat] = expense_categories.get(cat, 0) + amount

        # Trip dates for monthly trends
        start_date = trip.get("start_date")
        if start_date and len(start_date) >= 7:
            month = start_date[:7]
            monthly_spending[month] = monthly_spending.get(month, 0) + (trip.get("spent", 0) or 0)

    # Sort monthly spending chronologically
    sorted_months = sorted(monthly_spending.items())

    return {
        "trips_count": len(trips),
        "total_budget": total_budget,
        "total_spent": total_spent,
        "remaining_budget": max(0, total_budget - total_spent),
        "status_counts": status_counts,
        "expense_categories": expense_categories,
        "destinations": destinations,
        "monthly_spending": [{"month": k, "amount": v} for k, v in sorted_months],
        "avg_budget_per_trip": round(total_budget / max(len(trips), 1), 2),
        "avg_spent_per_trip": round(total_spent / max(len(trips), 1), 2),
    }
