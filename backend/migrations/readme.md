# Database Migrations

Versioned SQL migration files for the Atlas Travel Guide backend.

## Usage

### Supabase (current)

1. Go to your Supabase Dashboard > SQL Editor
2. Copy the contents of the migration file (e.g., `002_supabase.sql`)
3. Paste and run in SQL Editor
4. Tables are auto-created if they don't exist

### SQLite (legacy)
Run migrations in order using:
```bash
python -m migrations.apply
```

Or use the built-in migration logic in `routes/trips.py` (init_db) and `routes/auth.py` (init_users_db) which auto-apply on startup.
