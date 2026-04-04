"""
Tenant resolution and business config loading from Supabase.

Phase D: Replaces static business_config.json with dynamic per-tenant
config loaded from the businesses + services tables.

Two resolution paths:
1. Voice calls: incoming phone number (To field) → phone_number_mappings → business_id
2. Web/API: JWT + X-Business-Id header → business_id (handled by auth.py)
"""
from typing import Optional
from models import BusinessConfig, Service, WorkingHours, ContactInfo
from supabase_client import get_supabase

# Simple in-memory cache: business_id → (BusinessConfig, timestamp)
# Avoids hitting Supabase on every voice turn. Cleared on process restart.
_config_cache: dict = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes


def resolve_business_from_phone(to_number: str) -> Optional[str]:
    """
    Resolve a provider phone number (the 'To' field from Twilio/SignalWire
    webhook) to a business_id.

    Returns business_id (UUID string) or None if no mapping found.
    """
    sb = get_supabase()
    result = sb.table("phone_number_mappings").select("business_id").eq(
        "phone_number", to_number
    ).eq("is_active", True).execute()

    if result.data:
        return result.data[0]["business_id"]
    return None


def get_business_config(business_id: str) -> BusinessConfig:
    """
    Load a BusinessConfig for the given business_id from Supabase.
    Uses a short TTL cache to avoid repeated queries during a single call.

    Falls back to the static config.py loader if business_id is None
    (backward compat for Phase C single-tenant mode).
    """
    import time

    if not business_id:
        # Fallback: single-tenant mode using business_config.json
        from config import get_config
        return get_config()

    # Check cache
    now = time.time()
    cached = _config_cache.get(business_id)
    if cached and (now - cached[1]) < _CACHE_TTL_SECONDS:
        return cached[0]

    sb = get_supabase()

    # Fetch business row
    biz_result = sb.table("businesses").select("*").eq("id", business_id).execute()
    if not biz_result.data:
        raise ValueError(f"Business {business_id} not found")

    biz = biz_result.data[0]

    # Fetch active services for this business
    svc_result = sb.table("services").select("*").eq(
        "business_id", business_id
    ).eq("is_active", True).order("name").execute()

    services = [
        Service(
            name=s["name"],
            price=float(s["price"]),
            duration=s["duration"],
            description=s.get("description", "")
        )
        for s in svc_result.data
    ]

    # Build WorkingHours from JSONB
    wh = biz.get("working_hours", {})
    working_hours = WorkingHours(
        monday=wh.get("monday", "Closed"),
        tuesday=wh.get("tuesday", "Closed"),
        wednesday=wh.get("wednesday", "Closed"),
        thursday=wh.get("thursday", "Closed"),
        friday=wh.get("friday", "Closed"),
        saturday=wh.get("saturday", "Closed"),
        sunday=wh.get("sunday", "Closed"),
    )

    # Build ContactInfo
    contact_info = ContactInfo(
        phone=biz.get("phone", ""),
        email=biz.get("email", ""),
        address=biz.get("address", ""),
    )

    config = BusinessConfig(
        business_name=biz["name"],
        working_hours=working_hours,
        services=services,
        contact_info=contact_info,
        timezone=biz.get("timezone", "Asia/Karachi"),
        greeting_message=biz.get("greeting_message"),
    )

    _config_cache[business_id] = (config, now)
    return config


def invalidate_config_cache(business_id: Optional[str] = None):
    """Clear cached config for a business, or all if None."""
    if business_id:
        _config_cache.pop(business_id, None)
    else:
        _config_cache.clear()
