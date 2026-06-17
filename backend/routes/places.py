import logging
from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional
import httpx
from .limiter import limiter
from .cache import get_cache, set_cache, cache_key

logger = logging.getLogger("atlas.places")

router = APIRouter()

# Overpass API endpoint (free, no auth)
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_FALLBACKS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

# Map of place categories to OSM tags
PLACE_CATEGORIES = {
    "attractions": [
        '"tourism"="attraction"',
        '"tourism"="museum"',
        '"tourism"="viewpoint"',
        '"tourism"="artwork"',
        '"historic"="monument"',
        '"historic"="castle"',
        '"leisure"="park"',
    ],
    "restaurants": [
        '"amenity"="restaurant"',
        '"amenity"="cafe"',
        '"amenity"="fast_food"',
        '"amenity"="bar"',
    ],
    "shopping": [
        '"shop"="mall"',
        '"shop"="gift"',
        '"shop"="souvenir"',
    ],
    "transport": [
        '"amenity"="bus_station"',
        '"railway"="station"',
        '"amenity"="taxi"',
        '"amenity"="bicycle_rental"',
    ],
}


@router.get("/nearby")
@limiter.limit("20/minute")
async def get_nearby_places(
    request: Request,
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius: int = Query(1000, description="Search radius in meters (max 5000)"),
    category: Optional[str] = Query(None, description="Place category: attractions, restaurants, shopping, transport"),
    limit: int = Query(50, description="Max results", le=100),
):
    if radius < 100 or radius > 10000:
        raise HTTPException(status_code=400, detail="Radius must be between 100 and 10000 meters")

    ck = cache_key("places", f"{lat:.3f}", f"{lon:.3f}", str(radius), category or "all", str(limit))
    cached = get_cache(ck)
    if cached:
        return cached

    tags = PLACE_CATEGORIES.get(category)
    if category and not tags:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Choose from: {', '.join(PLACE_CATEGORIES.keys())}",
        )

    # Build Overpass QL query
    tag_filter = "(" + "".join(f"node[{t}](around:{radius},{lat},{lon});" for t in (tags or sum(PLACE_CATEGORIES.values(), []))) + ")"
    overpass_query = f"""
    [out:json][timeout:15];
    (
      {tag_filter}
    );
    out body {limit};
    """

    urls = [OVERPASS_URL] + OVERPASS_FALLBACKS
    last_exc = None
    for url in urls:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    url,
                    data={"data": overpass_query},
                    headers={"User-Agent": "AtlasTravelGuide/2.0"},
                )
                resp.raise_for_status()
                data = resp.json()
                last_exc = None
                break
        except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.RequestError) as e:
            last_exc = e
            logger.warning("Overpass API %s failed: %s", url, e)
            continue
    if last_exc:
        if isinstance(last_exc, httpx.TimeoutException):
            raise HTTPException(status_code=504, detail="Overpass API timed out. Try a smaller radius.")
        if isinstance(last_exc, httpx.HTTPStatusError):
            raise HTTPException(status_code=502, detail=f"Overpass API error: {last_exc.response.status_code}")
        raise HTTPException(status_code=500, detail="Failed to fetch nearby places")

    elements = data.get("elements", [])

    places = []
    for el in elements:
        tags = el.get("tags", {})
        lat_val = el.get("lat")
        lon_val = el.get("lon")

        if not lat_val or not lon_val:
            continue

        # Determine place type
        place_type = _get_place_type(tags)

        places.append({
            "id": el.get("id"),
            "name": tags.get("name", tags.get("brand", _get_fallback_name(tags, place_type))),
            "type": place_type,
            "lat": lat_val,
            "lon": lon_val,
            "address": _get_address(tags),
            "phone": tags.get("phone", ""),
            "website": tags.get("website", ""),
            "opening_hours": tags.get("opening_hours", ""),
            "rating": _get_rating(tags),
            "cuisine": tags.get("cuisine", ""),
            "description": _get_description(tags),
        })

    result = {
        "lat": lat,
        "lon": lon,
        "radius": radius,
        "category": category or "all",
        "count": len(places),
        "places": places,
    }
    set_cache(ck, result, ttl=600)
    return result


def _get_place_type(tags: dict) -> str:
    if tags.get("amenity") in ("restaurant", "cafe", "fast_food", "bar"):
        return "restaurant"
    if tags.get("tourism") in ("attraction", "museum", "viewpoint", "artwork"):
        return "attraction"
    if tags.get("historic"):
        return "attraction"
    if tags.get("leisure") == "park":
        return "attraction"
    if tags.get("shop"):
        return "shopping"
    if tags.get("amenity") in ("bus_station", "taxi", "bicycle_rental"):
        return "transport"
    if tags.get("railway") == "station":
        return "transport"
    return "other"


def _get_fallback_name(tags: dict, place_type: str) -> str:
    name = tags.get("name", "")
    if name:
        return name
    # Generate a descriptive name from tags
    amenity = tags.get("amenity", "")
    tourism = tags.get("tourism", "")
    historic = tags.get("historic", "")
    shop = tags.get("shop", "")
    cuisine = tags.get("cuisine", "")
    if cuisine:
        return f"{cuisine.title()} {amenity.title() or place_type.title()}"
    return (amenity or tourism or historic or shop or place_type).replace("_", " ").title() or "Unknown Place"


def _get_address(tags: dict) -> str:
    parts = [
        tags.get("addr:housenumber", ""),
        tags.get("addr:street", ""),
        tags.get("addr:city", ""),
        tags.get("addr:country", ""),
    ]
    return ", ".join(p for p in parts if p)


def _get_rating(tags: dict) -> Optional[float]:
    # Some places have rating tags
    try:
        return float(tags.get("rating", 0)) or None
    except (ValueError, TypeError):
        return None


def _get_description(tags: dict) -> str:
    return (
        tags.get("description")
        or tags.get("note")
        or tags.get("wikipedia")
        or ""
    )


@router.get("/categories")
@limiter.limit("60/minute")
async def list_categories(request: Request):
    return {
        "categories": [
            {"id": "attractions", "label": "Attractions & Sights", "icon": "landmark"},
            {"id": "restaurants", "label": "Restaurants & Cafes", "icon": "utensils"},
            {"id": "shopping", "label": "Shopping", "icon": "shopping-bag"},
            {"id": "transport", "label": "Transport", "icon": "train"},
        ]
    }
