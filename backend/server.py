from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import chat, weather, currency, trips, images, emergency, auth, itinerary
import uvicorn

app = FastAPI(
    title="Atlas Smart Travel Guide API",
    description="AI-powered travel assistant — Groq LLaMA, streaming, auth, itinerary generation",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(chat.router,       prefix="/api/chat",       tags=["AI Chat"])
app.include_router(itinerary.router,  prefix="/api/itinerary",  tags=["Itinerary"])
app.include_router(weather.router,    prefix="/api/weather",    tags=["Weather"])
app.include_router(currency.router,   prefix="/api/currency",   tags=["Currency"])
app.include_router(trips.router,      prefix="/api/trips",      tags=["Trips"])
app.include_router(images.router,     prefix="/api/images",     tags=["Image AI"])
app.include_router(emergency.router,  prefix="/api/emergency",  tags=["Emergency"])


@app.get("/")
async def root():
    return {"status": "ok", "version": "2.0.0", "message": "Atlas API running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
