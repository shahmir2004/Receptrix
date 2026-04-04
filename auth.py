"""
Authentication & authorization helpers for Phase D multi-tenant support.

Uses Supabase Auth for user management.  The service-role client is used
for admin operations (creating businesses, memberships).  JWT validation
extracts user_id from the Supabase access token so API endpoints can
resolve the caller's business context.
"""
import os
from typing import Optional, Tuple
from datetime import datetime

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from supabase_client import get_supabase

# FastAPI security scheme — extracts Bearer token from Authorization header
_bearer = HTTPBearer(auto_error=False)


def _extract_error_message(exc: Exception) -> str:
    """Best-effort extraction of a useful error message from Supabase errors."""
    for attr in ("message", "detail", "error_description", "error"):
        value = getattr(exc, attr, None)
        if value:
            return str(value)

    response = getattr(exc, "response", None)
    if response is not None:
        try:
            body = response.json()
            if isinstance(body, dict):
                for key in ("message", "detail", "error", "error_description", "msg"):
                    if body.get(key):
                        return str(body[key])
                return str(body)
            if body:
                return str(body)
        except Exception:
            text = getattr(response, "text", None)
            if text:
                return str(text)

    if exc.args:
        return str(exc.args[0])
    return str(exc)


def _extract_status_code(exc: Exception, default: int = 400) -> int:
    """Return a status code when the upstream error exposes one."""
    status_code = getattr(exc, "status_code", None)
    if isinstance(status_code, int) and 400 <= status_code < 600:
        return status_code

    if isinstance(exc, RuntimeError):
        return 503

    return default


# ============ JWT / Current User ============

def get_current_user_id(request: Request) -> Optional[str]:
    """
    Extract user_id from Supabase JWT in the Authorization header.
    Returns None if no valid token is present (allows mixed auth/anon endpoints).
    """
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1]
    sb = get_supabase()
    try:
        user_resp = sb.auth.get_user(token)
        if user_resp and user_resp.user:
            return str(user_resp.user.id)
    except Exception:
        pass
    return None


async def require_auth(request: Request) -> str:
    """
    FastAPI dependency — raises 401 if no valid Supabase JWT.
    Returns the authenticated user_id (UUID string).
    """
    user_id = get_current_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


async def require_business_access(request: Request) -> Tuple[str, str]:
    """
    FastAPI dependency — raises 401/403 if user is not authenticated
    or not a member of the business specified by X-Business-Id header.
    Returns (user_id, business_id) tuple.
    """
    user_id = await require_auth(request)
    business_id = request.headers.get("x-business-id", "")
    if not business_id:
        raise HTTPException(status_code=400, detail="X-Business-Id header required")

    sb = get_supabase()
    result = sb.table("business_memberships").select("id").eq(
        "user_id", user_id
    ).eq("business_id", business_id).execute()

    if not result.data:
        raise HTTPException(status_code=403, detail="Not a member of this business")

    return user_id, business_id


async def require_business_admin(request: Request) -> Tuple[str, str]:
    """
    FastAPI dependency — like require_business_access but requires owner/admin role.
    Returns (user_id, business_id) tuple.
    """
    user_id = await require_auth(request)
    business_id = request.headers.get("x-business-id", "")
    if not business_id:
        raise HTTPException(status_code=400, detail="X-Business-Id header required")

    sb = get_supabase()
    result = sb.table("business_memberships").select("role").eq(
        "user_id", user_id
    ).eq("business_id", business_id).execute()

    if not result.data:
        raise HTTPException(status_code=403, detail="Not a member of this business")

    role = result.data[0]["role"]
    if role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Owner or admin role required")

    return user_id, business_id


# ============ Sign Up / Sign In ============

def sign_up(email: str, password: str, full_name: str = "") -> dict:
    """
    Create a new Supabase Auth user.
    The on_auth_user_created trigger auto-creates the profiles row.
    Returns {"user_id": ..., "session": ...} on success.
    """
    sb = get_supabase()
    try:
        result = sb.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {"full_name": full_name}
            }
        })
    except Exception as exc:
        detail = _extract_error_message(exc)
        raise HTTPException(
            status_code=_extract_status_code(exc, default=400),
            detail=f"Sign-up failed: {detail}",
        ) from exc

    if not result.user:
        raise HTTPException(status_code=400, detail="Sign-up failed: no user was returned")

    return {
        "user_id": str(result.user.id),
        "email": result.user.email,
        "access_token": result.session.access_token if result.session else None,
        "refresh_token": result.session.refresh_token if result.session else None,
    }


def sign_in(email: str, password: str) -> dict:
    """
    Sign in an existing user. Returns tokens + user info.
    """
    sb = get_supabase()
    result = sb.auth.sign_in_with_password({
        "email": email,
        "password": password,
    })
    if not result.user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Look up their business memberships
    memberships = sb.table("business_memberships").select(
        "business_id, role, businesses(id, name)"
    ).eq("user_id", str(result.user.id)).execute()

    return {
        "user_id": str(result.user.id),
        "email": result.user.email,
        "access_token": result.session.access_token,
        "refresh_token": result.session.refresh_token,
        "businesses": [
            {
                "business_id": m["business_id"],
                "role": m["role"],
                "business_name": m["businesses"]["name"] if m.get("businesses") else None
            }
            for m in memberships.data
        ] if memberships.data else []
    }


# ============ Business Onboarding ============

def create_business_for_user(
    user_id: str,
    business_name: str,
    phone: str = "",
    email: str = "",
    address: str = "",
    timezone: str = "Asia/Karachi",
    greeting_message: str = "",
    working_hours: Optional[dict] = None
) -> dict:
    """
    Create a new business and assign the user as owner.
    Returns the new business record.
    """
    sb = get_supabase()

    now = datetime.now().isoformat()
    default_hours = {
        "monday": "9:00 AM - 6:00 PM",
        "tuesday": "9:00 AM - 6:00 PM",
        "wednesday": "9:00 AM - 6:00 PM",
        "thursday": "9:00 AM - 6:00 PM",
        "friday": "9:00 AM - 6:00 PM",
        "saturday": "10:00 AM - 4:00 PM",
        "sunday": "Closed"
    }

    biz_data = {
        "name": business_name,
        "phone": phone,
        "email": email,
        "address": address,
        "timezone": timezone,
        "greeting_message": greeting_message or "Thank you for calling. How may I assist you today?",
        "working_hours": working_hours or default_hours,
        "created_at": now,
        "updated_at": now,
    }

    result = sb.table("businesses").insert(biz_data).execute()
    business = result.data[0]

    # Create owner membership
    sb.table("business_memberships").insert({
        "user_id": user_id,
        "business_id": business["id"],
        "role": "owner",
    }).execute()

    return business


def add_business_member(business_id: str, email: str, role: str = "staff") -> dict:
    """
    Add a user to a business by their email.
    The user must already have a Supabase Auth account (and therefore a profile).
    """
    sb = get_supabase()

    # Look up the user's profile by email
    profile = sb.table("profiles").select("id").eq("email", email).execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail=f"No user found with email {email}")

    target_user_id = profile.data[0]["id"]

    sb.table("business_memberships").insert({
        "user_id": target_user_id,
        "business_id": business_id,
        "role": role,
    }).execute()

    return {"user_id": target_user_id, "business_id": business_id, "role": role}
