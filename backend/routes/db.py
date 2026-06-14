import os
from contextlib import contextmanager
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment "
        "(see backend/.env.example)"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


@contextmanager
def get_db():
    yield supabase


@contextmanager
def get_db_write():
    yield supabase
