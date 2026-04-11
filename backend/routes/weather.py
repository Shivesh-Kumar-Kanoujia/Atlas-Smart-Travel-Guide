from fastapi import APIRouter, HTTPException, Query
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
WEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
BASE_URL = "https://api.openweathermap.org/data/2.5"


@router.get("/")
async def get_weather(city: str = Query(..., description="City name")):
    if not WEATHER_API_KEY:
        # Return mock data if no API key
        return {
            "city": city,
            "country": "--",
            "temperature": 22,
            "feels_like": 21,
            "humidity": 60,
            "description": "Partly cloudy",
            "icon": "02d",
            "wind_speed": 5.5,
            "visibility": 10000,
            "mock": True,
        }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{BASE_URL}/weather",
                params={"q": city, "appid": WEATHER_API_KEY, "units": "metric"},
            )
            if resp.status_code == 404:
                raise HTTPException(status_code=404, detail=f"City '{city}' not found")
            resp.raise_for_status()
            data = resp.json()

        return {
            "city": data["name"],
            "country": data["sys"]["country"],
            "temperature": round(data["main"]["temp"]),
            "feels_like": round(data["main"]["feels_like"]),
            "humidity": data["main"]["humidity"],
            "description": data["weather"][0]["description"].capitalize(),
            "icon": data["weather"][0]["icon"],
            "wind_speed": data["wind"]["speed"],
            "visibility": data.get("visibility", 0),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecast")
async def get_forecast(city: str = Query(...), days: int = Query(5, le=7)):
    if not WEATHER_API_KEY:
        return {"city": city, "forecast": [], "mock": True}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{BASE_URL}/forecast",
                params={"q": city, "appid": WEATHER_API_KEY, "units": "metric", "cnt": days * 8},
            )
            resp.raise_for_status()
            data = resp.json()

        # Get one forecast per day (noon)
        daily = {}
        for item in data["list"]:
            date = item["dt_txt"].split(" ")[0]
            if date not in daily and "12:00:00" in item["dt_txt"]:
                daily[date] = {
                    "date": date,
                    "temp_min": round(item["main"]["temp_min"]),
                    "temp_max": round(item["main"]["temp_max"]),
                    "description": item["weather"][0]["description"].capitalize(),
                    "icon": item["weather"][0]["icon"],
                    "humidity": item["main"]["humidity"],
                }

        return {"city": data["city"]["name"], "forecast": list(daily.values())[:days]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
