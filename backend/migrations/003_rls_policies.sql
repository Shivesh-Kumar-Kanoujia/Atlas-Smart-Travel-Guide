-- Migration 003: Row Level Security Policies
-- Run this AFTER 002_supabase.sql in your Supabase SQL Editor (Dashboard > SQL Editor)
-- 
-- IMPORTANT: The app uses the service_role key which BYPASSES RLS.
-- These policies provide defense-in-depth for direct DB access.

-- ============================================================
-- 1. Enable RLS on tables that were missing it
-- ============================================================
ALTER TABLE IF EXISTS public.shared_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Helper: get the user_id from the custom JWT
--    Our auth tokens store the user's ID in the 'sub' claim.
-- ============================================================
-- We use current_setting('request.jwt.claims') which Supabase
-- populates from the JWT sent with the request.
-- For service_role requests, this returns the service_role claims.

-- ============================================================
-- 3. RLS Policies
-- ============================================================

-- ── users ────────────────────────────────────────────────────
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
    FOR SELECT
    USING (id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
    FOR UPDATE
    USING (id = current_setting('request.jwt.claims')::json->>'sub')
    WITH CHECK (id = current_setting('request.jwt.claims')::json->>'sub');

-- Allow insert during registration (no auth yet)
DROP POLICY IF EXISTS users_insert_public ON public.users;
CREATE POLICY users_insert_public ON public.users
    FOR INSERT
    WITH CHECK (true);

-- ── sessions ─────────────────────────────────────────────────
DROP POLICY IF EXISTS sessions_select_own ON public.sessions;
CREATE POLICY sessions_select_own ON public.sessions
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS sessions_delete_own ON public.sessions;
CREATE POLICY sessions_delete_own ON public.sessions
    FOR DELETE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- ── trips ────────────────────────────────────────────────────
DROP POLICY IF EXISTS trips_select_own ON public.trips;
CREATE POLICY trips_select_own ON public.trips
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS trips_insert_own ON public.trips;
CREATE POLICY trips_insert_own ON public.trips
    FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS trips_update_own ON public.trips;
CREATE POLICY trips_update_own ON public.trips
    FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub')
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS trips_delete_own ON public.trips;
CREATE POLICY trips_delete_own ON public.trips
    FOR DELETE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- ── conversations ────────────────────────────────────────────
DROP POLICY IF EXISTS conversations_select_own ON public.conversations;
CREATE POLICY conversations_select_own ON public.conversations
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS conversations_insert_own ON public.conversations;
CREATE POLICY conversations_insert_own ON public.conversations
    FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS conversations_update_own ON public.conversations;
CREATE POLICY conversations_update_own ON public.conversations
    FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS conversations_delete_own ON public.conversations;
CREATE POLICY conversations_delete_own ON public.conversations
    FOR DELETE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- ── messages ─────────────────────────────────────────────────
-- Messages are linked to conversations, which are owned by users.
-- We use a subquery to check ownership via the conversation.

DROP POLICY IF EXISTS messages_select_own ON public.messages;
CREATE POLICY messages_select_own ON public.messages
    FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE user_id = current_setting('request.jwt.claims')::json->>'sub'
        )
    );

DROP POLICY IF EXISTS messages_insert_own ON public.messages;
CREATE POLICY messages_insert_own ON public.messages
    FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE user_id = current_setting('request.jwt.claims')::json->>'sub'
        )
    );

-- ── user_preferences ─────────────────────────────────────────
DROP POLICY IF EXISTS preferences_select_own ON public.user_preferences;
CREATE POLICY preferences_select_own ON public.user_preferences
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS preferences_insert_own ON public.user_preferences;
CREATE POLICY preferences_insert_own ON public.user_preferences
    FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS preferences_update_own ON public.user_preferences;
CREATE POLICY preferences_update_own ON public.user_preferences
    FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- ── saved_map_views ──────────────────────────────────────────
DROP POLICY IF EXISTS saved_maps_select_own ON public.saved_map_views;
CREATE POLICY saved_maps_select_own ON public.saved_map_views
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS saved_maps_insert_own ON public.saved_map_views;
CREATE POLICY saved_maps_insert_own ON public.saved_map_views
    FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS saved_maps_update_own ON public.saved_map_views;
CREATE POLICY saved_maps_update_own ON public.saved_map_views
    FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS saved_maps_delete_own ON public.saved_map_views;
CREATE POLICY saved_maps_delete_own ON public.saved_map_views
    FOR DELETE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- ── shared_trips ─────────────────────────────────────────────
-- Anyone can read a shared trip by code (public share links)
DROP POLICY IF EXISTS shared_trips_select_public ON public.shared_trips;
CREATE POLICY shared_trips_select_public ON public.shared_trips
    FOR SELECT
    USING (true);

-- Only owner can insert/update/delete their share links
DROP POLICY IF EXISTS shared_trips_insert_own ON public.shared_trips;
CREATE POLICY shared_trips_insert_own ON public.shared_trips
    FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

DROP POLICY IF EXISTS shared_trips_delete_own ON public.shared_trips;
CREATE POLICY shared_trips_delete_own ON public.shared_trips
    FOR DELETE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- ============================================================
-- 4. Verification
-- ============================================================
-- Run this to confirm policies exist:
-- SELECT tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
