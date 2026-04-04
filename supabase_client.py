"""
Supabase client singleton.
Uses the service-role key so all DB calls bypass RLS.
(RLS policies exist for the future React frontend; the Python backend
operates as a trusted service and never uses the anon/JWT path.)
"""
import os
from supabase import create_client, Client

_client: Client | None = None


def get_supabase() -> Client:
    """Return the shared Supabase service-role client, creating it on first call."""
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
            )
        _client = create_client(url, key)
    return _client
