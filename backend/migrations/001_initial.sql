-- Migration 001: Initial schema (Trips, Users, Sessions)
-- Applied automatically by init_db() in trips.py and auth.py

CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'anonymous',
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
    itinerary TEXT DEFAULT '[]',
    latitude REAL,
    longitude REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar TEXT,
    provider TEXT DEFAULT 'email',
    password_hash TEXT,
    plan TEXT DEFAULT 'free',
    travel_memory TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS saved_map_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'anonymous',
    trip_id INTEGER,
    name TEXT DEFAULT 'My Map',
    map_state TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_saved_maps_user ON saved_map_views(user_id);
