"""Run Supabase migration SQL via postgrest raw SQL endpoint."""
import os, sys
from pathlib import Path

# Add parent dir to path so we can import from routes
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    sys.exit(1)

import httpx

# Supabase postgrest URL for raw SQL (uses /rest/v1/rpc/ pattern)
ref = SUPABASE_URL.replace("https://", "").split(".")[0]
print(f"Project ref: {ref}")

# Try using the direct postgres endpoint via supabase-py's internal client
from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Read the migration files
migration_dir = Path(__file__).resolve().parent.parent / "migrations"
sql_files = sorted(migration_dir.glob("*.sql"))

for sql_file in sql_files:
    print(f"\n{'='*60}")
    print(f"Processing: {sql_file.name}")
    print(f"{'='*60}")
    sql = sql_file.read_text()
    
    # Try to run SQL via postgrest
    try:
        # Use the postgrest client's rpc method to execute raw SQL
        # This requires the pg_execute function to exist on Supabase
        response = supabase.postgrest.rpc(
            "pg_execute",
            {"query": sql.replace("'", "''")}
        ).execute()
        print(f"  ✓ {sql_file.name} executed successfully via pg_execute")
    except Exception as e:
        error_str = str(e).lower()
        if "function pg_execute does not exist" in error_str:
            print(f"  ⚠ pg_execute not available. Trying alternative method...")
            # Try direct REST API call
            postgrest_url = f"{SUPABASE_URL}/rest/v1/"
            headers = {
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
            }
            try:
                # PostgREST allows calling functions via POST to /rpc/{function_name}
                # But we need the function to exist. Let's try creating it first.
                print(f"  ⚠ Need to run in Supabase SQL Editor. Cannot execute DDL via REST API.")
                break
            except Exception as e2:
                print(f"  ✗ {e2}")
                break
        else:
            print(f"  ✗ {error_str[:200]}")
            break

print(f"\n{'='*60}")
print("Migration status")
print(f"{'='*60}")
print("")
print("SQL DDL cannot be executed via the Supabase REST API.")
print("Please run the migration files manually in Supabase SQL Editor:")
print("")
print("  1. Go to https://supabase.com/dashboard/project/zdbzalysfkwikrbaullt/sql/new")
print("  2. Paste the contents of each .sql file in order:")
for i, sql_file in enumerate(sorted(migration_dir.glob("*.sql"))):
    print(f"     {i+1}. {sql_file.name}")
print("  3. Click 'Run' or press Cmd+Enter")
