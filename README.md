# Atlas — Smart Travel Guide

AI-powered full-stack travel assistant built with **Next.js 14**, **FastAPI**, and **Groq LLaMA**.

> All AI features use the **Groq API** — no Azure, no OpenAI required.

---

## Features

| Feature | Description |
|---|---|
| AI Chatbot | Mood and budget-aware travel recommendations via Groq LLaMA with streaming support |
| Image AI Analysis | Upload a travel photo — AI identifies the destination, landmarks, and provides travel tips |
| Trip Planner | Full CRUD for trips with destination, dates, budget, notes, and status tracking |
| Itinerary Generator | AI-powered day-by-day itinerary generation |
| Budget Tracker | Per-trip expenses by category, spending vs. budget tracking, and aggregate analytics |
| Packing List | Tap-to-toggle packed/unpacked items with quick templates and AI suggestions |
| Weather | Current conditions and 5-day forecast via OpenWeatherMap with mock data fallback |
| Currency Converter | Live conversion across 25+ currencies with offline fallback rates |
| Interactive Maps | Leaflet maps with markers, heatmap layer, routing, clustering, geosearch, and weather overlay |
| Nearby Places | Free Overpass API (OpenStreetMap) to find attractions, restaurants, and transport near any location |
| Emergency Info | AI-generated emergency numbers and safety information by country |
| Analytics Dashboard | Charts and insights for trips, expenses, categories, destinations, and monthly spending |
| Trip Sharing | Generate shareable links for trips with configurable expiration |
| User Personalization | Travel memory, preferences, and AI-generated personalized recommendations |
| Google OAuth | Social authentication alongside email/password login |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+
- Groq API Key (free at [console.groq.com](https://console.groq.com))

### Backend

```bash
cd backend
python -m venv venv

# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
# Add your GROQ_API_KEY and Supabase credentials to .env
python server.py
```

The API runs at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The app runs at `http://localhost:3000`.

### Docker

```bash
docker-compose up
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for all AI features |
| `SECRET_KEY` | Yes | Random secret for session and password salting |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `OPENWEATHER_API_KEY` | No | OpenWeatherMap API key (mock data fallback) |
| `EXCHANGE_API_KEY` | No | ExchangeRate-API key (offline rates fallback) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:3000`) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No | Google OAuth client ID |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (Pages Router), TypeScript, React 18 |
| Styling | Tailwind CSS 3.4, shadcn/ui components, Lucide icons |
| State | Zustand 5, TanStack React Query 5 |
| Charts | Recharts 3 |
| Maps | Leaflet 1.9 with react-leaflet and plugins |
| Backend | FastAPI (Python 3.12) with Uvicorn |
| Database | Supabase (PostgreSQL) |
| AI | Groq API — `llama-3.3-70b-versatile` (chat), `llama-3.2-11b-vision-preview` (images) |
| Auth | Email/password (bcrypt) + Google OAuth |
| Rate Limiting | slowapi |
| Testing | Vitest 4, Testing Library, jsdom |
| Containerization | Docker / docker-compose |
| CI/CD | GitHub Actions (typecheck, lint, build, test) |

---

## Project Structure

```
├── backend/
│   ├── server.py                  # FastAPI entry point
│   ├── requirements.txt
│   ├── routes/
│   │   ├── auth.py                # Registration, login, Google OAuth, sessions
│   │   ├── chat.py                # Streaming + non-streaming AI chat
│   │   ├── chat_history.py        # Conversation CRUD
│   │   ├── weather.py             # OpenWeatherMap (current + forecast)
│   │   ├── currency.py            # Live + offline currency conversion
│   │   ├── trips.py               # Trip CRUD, expenses, packing list
│   │   ├── images.py              # Groq Vision image analysis
│   │   ├── emergency.py           # AI-generated safety info
│   │   ├── itinerary.py           # AI day-by-day itinerary generation
│   │   ├── planning.py            # Budget estimation, packing suggestions
│   │   ├── places.py              # Overpass API (OSM) nearby places
│   │   ├── analytics.py           # Aggregated trip/expense analytics
│   │   ├── share.py               # Trip sharing links
│   │   ├── personalization.py     # User preferences + AI recommendations
│   │   ├── saved_maps.py          # Saved map state
│   │   ├── cache.py               # In-memory caching utility
│   │   ├── limiter.py             # Rate limiter setup
│   │   └── sanitize.py            # Input sanitization
│   ├── migrations/                # Database migration scripts
│   ├── tests/
│   └── Dockerfile
├── frontend/
│   ├── pages/
│   │   ├── _app.tsx               # App wrapper (auth, query, error boundary)
│   │   └── index.tsx              # Main SPA with tab navigation
│   ├── components/
│   │   ├── layout/                # AppLayout, Sidebar
│   │   ├── ui/                    # shadcn/ui primitives
│   │   ├── ChatBox.tsx            # AI chat interface
│   │   ├── TripManager.tsx        # Trip CRUD UI
│   │   ├── WeatherWidget.tsx       # Weather + forecast display
│   │   ├── CurrencyConverter.tsx   # Currency conversion UI
│   │   ├── ImageAnalyzer.tsx       # Drag-and-drop image analysis
│   │   ├── MapView.tsx            # Leaflet interactive map
│   │   ├── AnalyticsDashboard.tsx # Recharts analytics
│   │   ├── ItineraryPanel.tsx     # Day-by-day itinerary
│   │   ├── EmergencyInfo.tsx      # Emergency safety info
│   │   └── ...
│   ├── lib/
│   │   ├── api.ts                 # Axios API client
│   │   ├── auth.tsx               # Auth context and provider
│   │   ├── queryProvider.tsx      # TanStack Query provider
│   │   └── stores/                # Zustand stores (auth, chat, trip, UI)
│   ├── types/                     # TypeScript type definitions
│   ├── styles/globals.css         # Tailwind directives and custom styles
│   ├── tests/                     # Vitest test files
│   └── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Scripts

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |

### Backend

```bash
python server.py   # Start uvicorn with hot reload on port 8000
```

---

## Deployment

| Component | Platform |
|---|---|
| Backend | Railway or Render |
| Frontend | Vercel (set `NEXT_PUBLIC_API_URL` to your backend URL) |

---

## License

MIT
