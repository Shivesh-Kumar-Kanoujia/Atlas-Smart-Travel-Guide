# 🌍 Atlas — Smart Travel Guide

AI-powered full-stack travel assistant built with **Next.js**, **FastAPI**, and **Groq (LLaMA)**.

> ✅ Uses **only Groq API** for all AI features — no Azure, no OpenAI required.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI Chatbot | Mood & budget-aware travel recommendations via Groq LLaMA |
| 🖼️ Image AI | Upload a travel photo — AI identifies destination & tips |
| ✈️ Trip Planner | Full CRUD: create, edit, delete trips |
| 💰 Budget Tracker | Add expenses by category, track spending vs budget |
| 🎒 Packing List | Tap to toggle packed/unpacked with quick templates |
| 🌤️ Weather | Current conditions + 5-day forecast |
| 💱 Currency | Convert between 25+ currencies (live or offline fallback) |
| 🚨 Emergency | AI-generated emergency numbers & safety info by country |

---

## 🚀 Quick Start

### Step 1 — Get Your Free Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free) → Create API Key
3. Copy the key

### Step 2 — Backend Setup
```bash
cd backend
python -m venv venv

# Activate virtual environment:
# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
# Open .env and paste your GROQ_API_KEY
python server.py
# Backend runs at: http://localhost:8000
# API docs at:     http://localhost:8000/docs
```

### Step 3 — Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
# Frontend runs at: http://localhost:3000
```

---

## 🔑 API Keys

| Key | Where to Get | Required? |
|-----|-------------|-----------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | ✅ **Yes** |
| `OPENWEATHER_API_KEY` | [openweathermap.org/api](https://openweathermap.org/api) | Optional (mock data used if missing) |
| `EXCHANGE_API_KEY` | [exchangerate-api.com](https://exchangerate-api.com) | Optional (offline rates used if missing) |

---

## 📁 Project Structure

```
smart-travel-guide/
├── backend/
│   ├── server.py              # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── data/                  # Auto-created — SQLite database lives here
│   └── routes/
│       ├── chat.py            # Groq AI chatbot (mood + budget aware)
│       ├── weather.py         # OpenWeatherMap + 5-day forecast
│       ├── currency.py        # Currency conversion (live + fallback)
│       ├── trips.py           # CRUD trips + expenses + packing list
│       ├── images.py          # Groq Vision image analysis
│       └── emergency.py       # AI-generated emergency safety info
└── frontend/
    ├── pages/
    │   ├── _app.js            # App wrapper + toast notifications
    │   └── index.js           # Main page + tab navigation
    ├── components/
    │   ├── Navbar.js          # Sticky top navigation
    │   ├── ChatBox.js         # Chat interface with mood/budget toggles
    │   ├── TravelCard.js      # Trip card component
    │   ├── TripManager.js     # Full trip management UI
    │   ├── WeatherWidget.js   # Weather search + forecast display
    │   ├── CurrencyConverter.js
    │   ├── ImageAnalyzer.js   # Drag & drop image + AI analysis
    │   └── EmergencyInfo.js   # Emergency info by destination
    ├── lib/
    │   └── api.js             # All axios API calls in one place
    └── styles/
        └── globals.css        # Tailwind + custom styles + Google Fonts
```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, React, Axios
- **Backend**: FastAPI (Python), SQLite, Uvicorn
- **AI**: Groq API — `llama-3.3-70b-versatile` (chat) + `llama-3.2-11b-vision-preview` (images)
- **APIs**: OpenWeatherMap (optional), ExchangeRate-API (optional)

---

## 🌐 Deployment

**Backend** → Deploy to [Railway](https://railway.app) or [Render](https://render.com)
**Frontend** → Deploy to [Vercel](https://vercel.com) — just set `NEXT_PUBLIC_API_URL` to your backend URL
