-- Migration 002: Supabase/PostgreSQL schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar TEXT,
    provider TEXT DEFAULT 'email',
    password_hash TEXT,
    plan TEXT DEFAULT 'free',
    travel_memory TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trips (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'anonymous',
    name TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    budget DOUBLE PRECISION DEFAULT 0,
    spent DOUBLE PRECISION DEFAULT 0,
    notes TEXT,
    packing_list TEXT DEFAULT '[]',
    expenses TEXT DEFAULT '[]',
    status TEXT DEFAULT 'planned',
    itinerary TEXT DEFAULT '[]',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Chat history tables
CREATE TABLE IF NOT EXISTS public.conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Chat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);

-- Trip sharing table
CREATE TABLE IF NOT EXISTS public.shared_trips (
    code TEXT PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shared_trips_trip ON public.shared_trips(trip_id);

-- User preferences table for personalization
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    preferred_moods TEXT DEFAULT '["adventurous"]',
    preferred_budget TEXT DEFAULT 'mid-range',
    favorite_destinations TEXT DEFAULT '[]',
    bucket_list TEXT DEFAULT '[]',
    travel_style TEXT DEFAULT '',
    interests TEXT DEFAULT '[]',
    dietary_preferences TEXT DEFAULT '',
    accommodation_preference TEXT DEFAULT '',
    pace TEXT DEFAULT 'moderate',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional, can be configured later)
-- Saved map views table
CREATE TABLE IF NOT EXISTS public.saved_map_views (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trip_id BIGINT REFERENCES public.trips(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'My Map',
    map_state TEXT DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_maps_user ON public.saved_map_views(user_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_map_views ENABLE ROW LEVEL SECURITY;
