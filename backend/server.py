import os
import time
import uuid
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env before any route imports so env vars are available
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes import chat, weather, currency, trips, images, emergency, auth, itinerary, planning, places, analytics, chat_history, share, personalization, saved_maps
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from routes.limiter import limiter
import uvicorn

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("atlas")

# ── Environment validation ─────────────────────────────────────────────────
REQUIRED_ENV = {
    "GROQ_API_KEY": "Groq API key for AI features",
    "SUPABASE_URL": "Supabase project URL",
    "SUPABASE_SERVICE_KEY": "Supabase service role key",
}

missing = [k for k, v in REQUIRED_ENV.items() if not os.getenv(k)]
if missing:
    for k in missing:
        logger.error("Missing required env var: %s (%s)", k, REQUIRED_ENV[k])
    raise SystemExit(
        f"Missing required environment variables: {', '.join(missing)}\n"
        f"Copy backend/.env.example to backend/.env and fill in the values."
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Atlas API starting — version 2.0.0 (Supabase)")
    from routes.db import supabase
    try:
        # Verify Supabase connection and clean expired sessions
        supabase.table("sessions").delete().lt("expires_at", time.time()).execute()
    except Exception as e:
        logger.warning("Supabase startup check failed: %s", e)
    yield
    logger.info("Atlas API shutting down")


app = FastAPI(
    title="Atlas Smart Travel Guide API",
    description="AI-powered travel assistant — Groq LLaMA, streaming, auth, itinerary generation",
    version="2.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow local dev + Vercel previews + custom env origins
DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "https://atlas-smart-travel-guide.vercel.app",
]
extra = os.getenv("CORS_ORIGINS", "")
if extra:
    DEFAULT_ORIGINS.extend(o.strip() for o in extra.split(",") if o.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEFAULT_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request ID middleware (tracing) ─────────────────────────────────────────
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    request.state.request_id = request_id
    start = time.time()
    response = await call_next(request)
    elapsed = time.time() - start
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{elapsed*1000:.0f}ms"
    logger.info("[%s] %s %s → %s (%.0fms)", request_id, request.method, request.url.path, response.status_code, elapsed * 1000)
    return response


# ── Security headers middleware ─────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), microphone=(), camera=()"
    # CSP - relaxed enough for Google auth redirects and inline styles used by shadcn
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://unpkg.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; "
        "img-src 'self' data: blob: https://*.openweathermap.org https://*.tile.openstreetmap.org https://unpkg.com; "
        "media-src 'self' data: blob:; "
        "connect-src 'self' http://localhost:* https://*.supabase.co https://overpass-api.de https://nominatim.openstreetmap.org; "
        "frame-src https://accounts.google.com; "
        "font-src 'self' data: https://fonts.gstatic.com;"
    )
    return response


from fastapi import HTTPException

# ── Global exception handler for unhandled errors ──────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    import traceback
    with open("error.log", "a") as f:
        f.write(traceback.format_exc())
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(chat.router,       prefix="/api/chat",       tags=["AI Chat"])
app.include_router(itinerary.router,  prefix="/api/itinerary",  tags=["Itinerary"])
app.include_router(weather.router,    prefix="/api/weather",    tags=["Weather"])
app.include_router(currency.router,   prefix="/api/currency",   tags=["Currency"])
app.include_router(trips.router,      prefix="/api/trips",      tags=["Trips"])
app.include_router(images.router,     prefix="/api/images",     tags=["Image AI"])
app.include_router(emergency.router,  prefix="/api/emergency",  tags=["Emergency"])
app.include_router(planning.router,   prefix="/api/planning",   tags=["AI Trip Planning"])
app.include_router(places.router,     prefix="/api/places",     tags=["Places"])
app.include_router(analytics.router,  prefix="/api/analytics",  tags=["Analytics"])
app.include_router(chat_history.router, prefix="/api/chat",   tags=["Chat History"])
app.include_router(share.router,       prefix="/api/share",   tags=["Sharing"])
app.include_router(personalization.router, prefix="/api/personalize", tags=["Personalization"])
app.include_router(saved_maps.router,      prefix="/api/maps",        tags=["Saved Maps"])


@app.get("/")
async def root():
    return {"status": "ok", "version": "2.0.0", "message": "Atlas API running"}


@app.get("/health")
async def health():
    from routes.db import supabase
    db_ok = False
    try:
        supabase.table("users").select("id").limit(1).execute()
        db_ok = True
    except Exception as e:
        logger.warning("Health check DB ping failed: %s", e)
    groq_key = bool(os.getenv("GROQ_API_KEY"))
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "groq_api": "configured" if groq_key else "missing",
    }


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
