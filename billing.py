"""Billing helpers for Receptrix Lemon Squeezy plans."""

from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime
from typing import Any, Optional

import httpx

from supabase_client import get_supabase


MEDICAL_CLINIC_PLAN_ID = "medical_clinic_monthly"
GENERAL_BUSINESS_PLAN_ID = "general_business_monthly"
MEDICAL_CLINIC_PRICE_CENTS = 29999
GENERAL_BUSINESS_PRICE_CENTS = 19999


def _plan_for_business_type(business_type: str) -> dict[str, Any]:
    if (business_type or "").strip().lower() == "general_business":
        return {
            "id": GENERAL_BUSINESS_PLAN_ID,
            "name": "Receptrix General Business",
            "price_cents": GENERAL_BUSINESS_PRICE_CENTS,
            "variant_env": "LEMONSQUEEZY_GENERAL_VARIANT_ID",
            "description": "$199.99/month AI receptionist for service businesses.",
        }
    return {
        "id": MEDICAL_CLINIC_PLAN_ID,
        "name": "Receptrix Medical Clinic",
        "price_cents": MEDICAL_CLINIC_PRICE_CENTS,
        "variant_env": "LEMONSQUEEZY_MEDICAL_VARIANT_ID",
        "description": "$299.99/month AI receptionist for US medical clinics.",
    }


def pricing_plans() -> list[dict[str, Any]]:
    """Return public pricing plans without exposing provider ids."""
    return [
        {
            "id": MEDICAL_CLINIC_PLAN_ID,
            "name": "Medical Clinic",
            "business_type": "medical_clinic",
            "price_cents": MEDICAL_CLINIC_PRICE_CENTS,
            "currency": "USD",
            "interval": "month",
            "included_vapi_numbers": 1,
            "included_voice_minutes": 500,
            "features": [
                "Vapi US phone number",
                "AI receptionist configured for clinics",
                "Live appointment scheduling into Receptrix",
                "HIPAA-ready call handling",
                "Dashboard AI settings and test calls",
            ],
        },
        {
            "id": GENERAL_BUSINESS_PLAN_ID,
            "name": "General Business",
            "business_type": "general_business",
            "price_cents": GENERAL_BUSINESS_PRICE_CENTS,
            "currency": "USD",
            "interval": "month",
            "included_vapi_numbers": 1,
            "included_voice_minutes": 500,
            "features": [
                "Vapi US phone number",
                "AI receptionist configured for service businesses",
                "Live appointment scheduling into Receptrix",
                "Services, hours, and greeting controls",
                "Dashboard AI settings and test calls",
            ],
        },
    ]


def is_subscription_active(status: Optional[str]) -> bool:
    return (status or "").lower() in {"active", "paid", "trialing"}


def get_subscription(business_id: str) -> dict[str, Any]:
    """Fetch the latest stored subscription state for a business."""
    sb = get_supabase()
    business = sb.table("businesses").select("business_type").eq("id", business_id).limit(1).execute()
    business_type = business.data[0].get("business_type", "medical_clinic") if business.data else "medical_clinic"
    plan = _plan_for_business_type(business_type)
    result = sb.table("business_subscriptions").select("*").eq(
        "business_id", business_id
    ).order("updated_at", desc=True).limit(1).execute()
    if result.data:
        sub = result.data[0]
        sub["voice_features_enabled"] = is_subscription_active(sub.get("status"))
        return sub
    if os.getenv("BYPASS_BILLING_FOR_DEMO", "false").lower() in {"1", "true", "yes", "on"}:
        return {
            "business_id": business_id,
            "plan_id": plan["id"],
            "status": "active",
            "voice_features_enabled": True,
            "demo_billing_bypass": True,
        }
    return {
        "business_id": business_id,
        "plan_id": plan["id"],
        "status": "pending",
        "voice_features_enabled": False,
    }


def sync_business_billing_status(business_id: str, status: str) -> None:
    sb = get_supabase()
    sb.table("businesses").update({
        "billing_status": status,
        "voice_features_enabled": is_subscription_active(status),
    }).eq("id", business_id).execute()


async def create_checkout(business_id: str, user_email: str = "") -> dict[str, Any]:
    """Create a Lemon Squeezy checkout URL for the business's plan."""
    api_key = os.getenv("LEMONSQUEEZY_API_KEY", "").strip()
    store_id = os.getenv("LEMONSQUEEZY_STORE_ID", "").strip()
    business = get_supabase().table("businesses").select("business_type").eq(
        "id", business_id
    ).limit(1).execute()
    business_type = business.data[0].get("business_type", "medical_clinic") if business.data else "medical_clinic"
    plan = _plan_for_business_type(business_type)
    variant_id = os.getenv(plan["variant_env"], "").strip()
    if not api_key or not store_id or not variant_id:
        raise RuntimeError(f"LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, and {plan['variant_env']} must be set.")

    checkout_data: dict[str, Any] = {
        "custom": {
            "business_id": business_id,
            "plan_id": plan["id"],
        }
    }
    if user_email:
        checkout_data["email"] = user_email

    attributes = {
        "checkout_data": checkout_data,
        "custom_price": plan["price_cents"],
        "product_options": {
            "name": plan["name"],
            "description": plan["description"],
        },
        "checkout_options": {
            "embed": False,
            "media": False,
            "logo": True,
        },
        "test_mode": os.getenv("LEMONSQUEEZY_TEST_MODE", "true").lower() in {"1", "true", "yes", "on"},
    }

    success_url = os.getenv("LEMONSQUEEZY_SUCCESS_URL", "").strip()
    cancel_url = os.getenv("LEMONSQUEEZY_CANCEL_URL", "").strip()
    if success_url:
        attributes["product_options"]["redirect_url"] = success_url
    if cancel_url:
        attributes["checkout_options"]["cancel_url"] = cancel_url

    payload = {
        "data": {
            "type": "checkouts",
            "attributes": attributes,
            "relationships": {
                "store": {"data": {"type": "stores", "id": store_id}},
                "variant": {"data": {"type": "variants", "id": variant_id}},
            },
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.lemonsqueezy.com/v1/checkouts",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
            },
            json=payload,
        )
    response.raise_for_status()
    data = response.json()
    checkout_url = data.get("data", {}).get("attributes", {}).get("url")
    if not checkout_url:
        raise RuntimeError("Lemon Squeezy did not return a checkout URL.")

    now = datetime.now().isoformat()
    get_supabase().table("business_subscriptions").upsert({
        "business_id": business_id,
        "plan_id": plan["id"],
        "provider": "lemonsqueezy",
        "status": "checkout_started",
        "provider_checkout_id": data.get("data", {}).get("id"),
        "updated_at": now,
    }, on_conflict="business_id").execute()

    return {"checkout_url": checkout_url, "plan_id": plan["id"]}


def verify_lemonsqueezy_signature(raw_body: bytes, signature: str) -> bool:
    secret = os.getenv("LEMONSQUEEZY_WEBHOOK_SECRET", "").strip()
    if not secret:
        return False
    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, (signature or "").strip())


def record_lemonsqueezy_webhook(event: dict[str, Any]) -> dict[str, Any]:
    """Persist subscription state from a Lemon Squeezy webhook."""
    meta = event.get("meta", {}) if isinstance(event, dict) else {}
    data = event.get("data", {}) if isinstance(event, dict) else {}
    attrs = data.get("attributes", {}) if isinstance(data, dict) else {}
    custom = meta.get("custom_data", {}) or {}

    business_id = custom.get("business_id")
    if not business_id:
        raise ValueError("Missing business_id in Lemon Squeezy custom_data.")

    event_name = meta.get("event_name", "unknown")
    status = attrs.get("status") or status_from_event_name(event_name)
    now = datetime.now().isoformat()

    row = {
        "business_id": business_id,
        "plan_id": custom.get("plan_id", MEDICAL_CLINIC_PLAN_ID),
        "provider": "lemonsqueezy",
        "status": status,
        "provider_subscription_id": str(data.get("id") or attrs.get("subscription_id") or ""),
        "provider_customer_id": str(attrs.get("customer_id") or ""),
        "renews_at": attrs.get("renews_at"),
        "ends_at": attrs.get("ends_at"),
        "raw_event_type": event_name,
        "updated_at": now,
    }

    sb = get_supabase()
    sb.table("business_subscriptions").upsert(row, on_conflict="business_id").execute()
    sb.table("billing_events").insert({
        "business_id": business_id,
        "provider": "lemonsqueezy",
        "event_name": event_name,
        "provider_event_id": str(meta.get("webhook_id") or data.get("id") or ""),
        "payload": event,
        "created_at": now,
    }).execute()
    sync_business_billing_status(business_id, status)
    return {"business_id": business_id, "status": status, "event_name": event_name}


def status_from_event_name(event_name: str) -> str:
    name = (event_name or "").lower()
    if name in {"subscription_created", "subscription_updated", "subscription_payment_success"}:
        return "active"
    if name in {"subscription_cancelled", "subscription_expired"}:
        return "cancelled"
    if name in {"subscription_payment_failed"}:
        return "past_due"
    return "pending"
