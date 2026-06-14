import logging
from fastapi import APIRouter, HTTPException, Query, Request
import httpx
import os
from .limiter import limiter

logger = logging.getLogger("atlas.weather")

router = APIRouter()
BASE_URL = "https://api.openweathermap.org/data/2.5"


@router.get("/")
@limiter.limit("20/minute")
async def get_weather(request: Request, city: str = Query(..., description="City name")):
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        logger.warning("OPENWEATHER_API_KEY not set, returning mock data")
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
                params={"q": city, "appid": api_key, "units": "metric"},
                timeout=15,
            )
            if resp.status_code == 401:
                logger.error("OpenWeatherMap API: invalid key (401)")
                raise HTTPException(status_code=502, detail="Weather API key is invalid or expired")
            if resp.status_code == 404:
                raise HTTPException(status_code=404, detail=f"City '{city}' not found")
            if resp.status_code == 429:
                raise HTTPException(status_code=502, detail="Weather API rate limit exceeded")
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
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Weather API timed out")
    except Exception as e:
        logger.exception("Weather fetch failed for city=%s", city)
        raise HTTPException(status_code=500, detail="Weather fetch failed")


@router.get("/by-coords")
@limiter.limit("30/minute")
async def get_weather_by_coords(
    request: Request,
    lat: float = Query(...),
    lon: float = Query(...),
):
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        return {
            "temperature": 22,
            "feels_like": 21,
            "humidity": 60,
            "description": "Partly cloudy",
            "icon": "02d",
            "wind_speed": 5.5,
            "mock": True,
        }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{BASE_URL}/weather",
                params={"lat": lat, "lon": lon, "appid": api_key, "units": "metric"},
                timeout=15,
            )
            if resp.status_code == 401:
                raise HTTPException(status_code=502, detail="Weather API key is invalid or expired")
            resp.raise_for_status()
            data = resp.json()
        return {
            "temperature": round(data["main"]["temp"]),
            "feels_like": round(data["main"]["feels_like"]),
            "humidity": data["main"]["humidity"],
            "description": data["weather"][0]["description"].capitalize(),
            "icon": data["weather"][0]["icon"],
            "wind_speed": data["wind"]["speed"],
            "visibility": data.get("visibility", 0),
            "city": data["name"],
        }
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Weather API timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Weather fetch failed")


@router.get("/forecast")
@limiter.limit("20/minute")
async def get_forecast(request: Request, city: str = Query(...), days: int = Query(5, le=7)):
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        return {"city": city, "forecast": [], "mock": True}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{BASE_URL}/forecast",
                params={"q": city, "appid": api_key, "units": "metric", "cnt": days * 8},
                timeout=15,
            )
            if resp.status_code == 401:
                raise HTTPException(status_code=502, detail="Weather API key is invalid or expired")
            resp.raise_for_status()
            data = resp.json()

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
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Weather API timed out")
    except Exception as e:
        logger.exception("Forecast fetch failed for city=%s", city)
        raise HTTPException(status_code=500, detail="Forecast fetch failed")
