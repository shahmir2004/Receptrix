"""
Authentication and authorization helpers for Supabase-backed multi-tenant auth.

This module centralizes:
- Input normalization and validation
- Structured auth error mapping
- Cookie/header token extraction
- CSRF protection for cookie-authenticated write requests
- Profile and password update helpers
"""

import re
from datetime import datetime
from typing import Any, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, Request

from supabase_client import get_supabase

_ACCESS_COOKIE_NAME = "rx_access_token"
_REFRESH_COOKIE_NAME = "rx_refresh_token"
_CSRF_COOKIE_NAME = "rx_csrf_token"
_CSRF_HEADER_NAME = "x-csrf-token"
_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_ALLOWED_ROLES = {"owner", "admin", "staff"}
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _http_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


def _extract_error_message(exc: Exception) -> str:
    """Best-effort extraction of a useful error message from Supabase exceptions."""
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


def _is_duplicate_user_error(message: str) -> bool:
    lowered = message.lower()
    return (
        "already registered" in lowered
        or "already exists" in lowered
        or "duplicate" in lowered
        or "unique" in lowered
    )


def _is_invalid_credentials_error(message: str) -> bool:
    lowered = message.lower()
    return (
        "invalid login credentials" in lowered
        or "invalid credentials" in lowered
        or "email or password" in lowered
        or "invalid_grant" in lowered
    )


def _is_email_not_confirmed_error(message: str) -> bool:
    lowered = message.lower()
    return "email not confirmed" in lowered or "email_not_confirmed" in lowered


def _is_invalid_email_error(message: str) -> bool:
    lowered = message.lower()
    return "invalid email" in lowered or "email address" in lowered


def _is_weak_password_error(message: str) -> bool:
    lowered = message.lower()
    return "password" in lowered and (
        "weak" in lowered
        or "least" in lowered
        or "minimum" in lowered
        or "characters" in lowered
    )


def _map_auth_error(exc: Exception, operation: str) -> HTTPException:
    message = _extract_error_message(exc)

    if isinstance(exc, HTTPException):
        return exc

    if isinstance(exc, RuntimeError):
        return _http_error(503, "AUTH_SERVICE_UNAVAILABLE", "Authentication service is unavailable.")

    if operation == "signup":
        if _is_duplicate_user_error(message):
            return _http_error(409, "USER_ALREADY_EXISTS", "An account with this email already exists. Please sign in.")
        if _is_invalid_email_error(message):
            return _http_error(422, "INVALID_EMAIL", "Please provide a valid email address.")
        if _is_weak_password_error(message):
            return _http_error(422, "WEAK_PASSWORD", "Password does not meet security requirements.")
        return _http_error(400, "SIGNUP_FAILED", f"Sign-up failed: {message}")

    if operation == "signin":
        if _is_email_not_confirmed_error(message):
            return _http_error(403, "EMAIL_NOT_VERIFIED", "Please verify your email before signing in.")
        if _is_invalid_credentials_error(message):
            return _http_error(401, "INVALID_CREDENTIALS", "Invalid email or password.")
        return _http_error(503, "SIGNIN_FAILED", "Unable to sign in right now. Please try again.")

    if operation == "profile_update":
        if _is_duplicate_user_error(message):
            return _http_error(409, "EMAIL_ALREADY_IN_USE", "That email address is already in use.")
        if _is_invalid_email_error(message):
            return _http_error(422, "INVALID_EMAIL", "Please provide a valid email address.")
        return _http_error(400, "PROFILE_UPDATE_FAILED", f"Could not update profile: {message}")

    if operation == "password_update":
        if _is_weak_password_error(message):
            return _http_error(422, "WEAK_PASSWORD", "New password does not meet security requirements.")
        return _http_error(400, "PASSWORD_UPDATE_FAILED", f"Could not update password: {message}")

    if operation == "refresh":
        if _is_invalid_credentials_error(message):
            return _http_error(401, "SESSION_EXPIRED", "Session expired. Please sign in again.")
        return _http_error(401, "SESSION_REFRESH_FAILED", "Could not refresh session. Please sign in again.")

    return _http_error(400, "AUTH_ERROR", message)


def normalize_email(email: str) -> str:
    normalized = (email or "").strip().lower()
    if not normalized or not _EMAIL_RE.match(normalized):
        raise _http_error(422, "INVALID_EMAIL", "Please provide a valid email address.")
    return normalized


def validate_password_strength(password: str, field_name: str = "password") -> None:
    value = password or ""
    if len(value) < 8:
        raise _http_error(422, "WEAK_PASSWORD", f"{field_name.capitalize()} must be at least 8 characters long.")
    if value.lower() == value:
        raise _http_error(422, "WEAK_PASSWORD", f"{field_name.capitalize()} must include at least one uppercase letter.")
    if value.upper() == value:
        raise _http_error(422, "WEAK_PASSWORD", f"{field_name.capitalize()} must include at least one lowercase letter.")
    if not any(ch.isdigit() for ch in value):
        raise _http_error(422, "WEAK_PASSWORD", f"{field_name.capitalize()} must include at least one number.")


def _normalize_business_name(name: str) -> str:
    normalized = (name or "").strip()
    if len(normalized) < 2:
        raise _http_error(422, "INVALID_BUSINESS_NAME", "Business name must be at least 2 characters long.")
    return normalized


def _validate_business_id(business_id: str) -> str:
    if not business_id:
        raise _http_error(400, "MISSING_BUSINESS_ID", "X-Business-Id header is required.")
    try:
        UUID(business_id)
    except ValueError as exc:
        raise _http_error(400, "INVALID_BUSINESS_ID", "X-Business-Id must be a valid UUID.") from exc
    return business_id


def _extract_access_token(request: Request) -> Tuple[Optional[str], Optional[str]]:
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1], "header"

    cookie_token = request.cookies.get(_ACCESS_COOKIE_NAME)
    if cookie_token:
        return cookie_token, "cookie"

    return None, None


def _enforce_csrf_for_cookie_auth(request: Request) -> None:
    if request.method.upper() not in _MUTATING_METHODS:
        return

    csrf_cookie = request.cookies.get(_CSRF_COOKIE_NAME, "")
    csrf_header = request.headers.get(_CSRF_HEADER_NAME, "")
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise _http_error(403, "CSRF_TOKEN_INVALID", "Security verification failed. Refresh and try again.")


def _list_memberships(user_id: str) -> list[dict[str, Any]]:
    sb = get_supabase()
    memberships = sb.table("business_memberships").select(
        "business_id, role, businesses(id, name)"
    ).eq("user_id", user_id).execute()

    return [
        {
            "business_id": m["business_id"],
            "role": m["role"],
            "business_name": m.get("businesses", {}).get("name") if m.get("businesses") else None,
        }
        for m in (memberships.data or [])
    ]


def _auth_response_user_payload(auth_response: Any) -> Optional[dict[str, Any]]:
    """Normalize admin get_user_by_id response across supabase-py versions."""
    if auth_response is None:
        return None

    raw_user = getattr(auth_response, "user", None)
    if raw_user is None and isinstance(auth_response, dict):
        raw_user = auth_response.get("user")

    if raw_user is None:
        return None

    if isinstance(raw_user, dict):
        return raw_user

    return {
        "id": getattr(raw_user, "id", None),
        "email": getattr(raw_user, "email", None),
        "user_metadata": getattr(raw_user, "user_metadata", {}) or {},
    }


def _ensure_profile_exists(user_id: str) -> None:
    """Ensure a profile row exists for user_id (covers trigger lag and signup edge cases)."""
    sb = get_supabase()

    profile_result = sb.table("profiles").select("id").eq("id", user_id).limit(1).execute()
    if profile_result.data:
        return

    try:
        auth_user_resp = sb.auth.admin.get_user_by_id(user_id)
    except Exception as exc:
        raise _http_error(409, "USER_ALREADY_EXISTS", "An account with this email already exists. Please sign in.") from exc

    auth_user = _auth_response_user_payload(auth_user_resp)
    if not auth_user or not auth_user.get("id") or not auth_user.get("email"):
        raise _http_error(409, "USER_ALREADY_EXISTS", "An account with this email already exists. Please sign in.")

    metadata = auth_user.get("user_metadata", {}) or {}
    profile_insert = {
        "id": str(auth_user["id"]),
        "email": str(auth_user["email"]),
        "full_name": str(metadata.get("full_name", "") or ""),
    }

    try:
        sb.table("profiles").insert(profile_insert).execute()
    except Exception as exc:
        msg = _extract_error_message(exc).lower()
        if "duplicate" in msg or "unique" in msg:
            return
        raise _http_error(400, "PROFILE_CREATE_FAILED", "Unable to initialize profile for this account.") from exc


def _try_auto_link_user_to_business(user_id: str, email: str) -> list[dict[str, Any]]:
    """Best-effort legacy recovery: link user to a matching business email when unambiguous."""
    try:
        normalized_email = normalize_email(email)
    except HTTPException:
        return []

    existing = _list_memberships(user_id)
    if existing:
        return existing

    sb = get_supabase()
    business_lookup = sb.table("businesses").select("id, name, email").ilike(
        "email", normalized_email
    ).limit(2).execute()

    matches = business_lookup.data or []
    if len(matches) != 1:
        return []

    business_id = matches[0].get("id")
    if not business_id:
        return []

    try:
        sb.table("business_memberships").insert({
            "user_id": user_id,
            "business_id": business_id,
            "role": "owner",
        }).execute()
    except Exception as exc:
        msg = _extract_error_message(exc).lower()
        if "duplicate" not in msg and "unique" not in msg:
            return []

    return _list_memberships(user_id)


def _derive_default_business_name(full_name: str, email: str) -> str:
    preferred = (full_name or "").strip()
    if len(preferred) >= 2:
        return f"{preferred}'s Business"

    local = ((email or "").split("@")[0] if email else "").strip()
    local = re.sub(r"[^a-zA-Z0-9]+", " ", local).strip().title()
    if len(local) >= 2:
        return f"{local} Business"

    return "My Business"


def _ensure_business_membership_context(user_id: str, email: str, full_name: str = "") -> list[dict[str, Any]]:
    """Ensure a signed-in user always has at least one business membership context."""
    memberships = _list_memberships(user_id)
    if memberships:
        return memberships

    memberships = _try_auto_link_user_to_business(user_id, email)
    if memberships:
        return memberships

    try:
        create_business_for_user(
            user_id=user_id,
            business_name=_derive_default_business_name(full_name, email),
            email=email,
        )
    except Exception:
        return _list_memberships(user_id)

    return _list_memberships(user_id)


# ============ JWT / Current User ============

def get_current_user_id(request: Request) -> Optional[str]:
    """Extract user_id from either Authorization header or secure access-token cookie."""
    token, source = _extract_access_token(request)
    if not token:
        return None

    sb = get_supabase()
    try:
        user_resp = sb.auth.get_user(token)
        if user_resp and user_resp.user:
            request.state.auth_source = source
            return str(user_resp.user.id)
    except Exception:
        return None
    return None


async def require_auth(request: Request) -> str:
    """FastAPI dependency — raises 401 if no valid session and enforces CSRF for cookie-authenticated writes."""
    user_id = get_current_user_id(request)
    if not user_id:
        raise _http_error(401, "NOT_AUTHENTICATED", "Please sign in to continue.")

    if getattr(request.state, "auth_source", None) == "cookie":
        _enforce_csrf_for_cookie_auth(request)

    return user_id


async def require_business_access(request: Request) -> Tuple[str, str]:
    """FastAPI dependency — valid session + membership in X-Business-Id."""
    user_id = await require_auth(request)
    business_id = _validate_business_id(request.headers.get("x-business-id", ""))

    sb = get_supabase()
    result = sb.table("business_memberships").select("id").eq(
        "user_id", user_id
    ).eq("business_id", business_id).limit(1).execute()

    if not result.data:
        raise _http_error(403, "BUSINESS_ACCESS_DENIED", "You do not have access to this business.")

    return user_id, business_id


async def require_business_admin(request: Request) -> Tuple[str, str]:
    """FastAPI dependency — valid session + owner/admin role in X-Business-Id."""
    user_id, business_id = await require_business_access(request)

    sb = get_supabase()
    result = sb.table("business_memberships").select("role").eq(
        "user_id", user_id
    ).eq("business_id", business_id).limit(1).execute()

    role = result.data[0]["role"] if result.data else None
    if role not in ("owner", "admin"):
        raise _http_error(403, "BUSINESS_ADMIN_REQUIRED", "Owner or admin role required.")

    return user_id, business_id


# ============ Sign Up / Sign In ============

def sign_up(email: str, password: str, full_name: str = "") -> dict[str, Any]:
    """Create a new Supabase Auth user and return session artifacts when available."""
    normalized_email = normalize_email(email)
    validate_password_strength(password)

    try:
        sb = get_supabase()
        result = sb.auth.sign_up({
            "email": normalized_email,
            "password": password,
            "options": {
                "data": {"full_name": (full_name or "").strip()}
            }
        })
    except Exception as exc:
        raise _map_auth_error(exc, "signup") from exc

    if not result.user:
        raise _http_error(400, "SIGNUP_FAILED", "Sign-up failed. Please try again.")

    metadata = getattr(result.user, "user_metadata", {}) or {}
    session = result.session
    identities = getattr(result.user, "identities", None) or []

    # Supabase can return a user-like object for existing accounts when anti-enumeration is enabled.
    # In this case we intentionally surface a conflict instead of continuing onboarding.
    if session is None and isinstance(identities, list) and len(identities) == 0:
        raise _http_error(409, "USER_ALREADY_EXISTS", "An account with this email already exists. Please sign in.")

    return {
        "user_id": str(result.user.id),
        "email": result.user.email,
        "full_name": metadata.get("full_name", (full_name or "").strip()),
        "access_token": session.access_token if session else None,
        "refresh_token": session.refresh_token if session else None,
        "needs_email_verification": session is None,
    }


def sign_in(email: str, password: str) -> dict[str, Any]:
    """Authenticate an existing user and return tokens + business memberships."""
    normalized_email = normalize_email(email)

    try:
        sb = get_supabase()
        result = sb.auth.sign_in_with_password({
            "email": normalized_email,
            "password": password,
        })
    except Exception as exc:
        raise _map_auth_error(exc, "signin") from exc

    if not result.user or not result.session:
        raise _http_error(401, "INVALID_CREDENTIALS", "Invalid email or password.")

    user_id = str(result.user.id)
    _ensure_profile_exists(user_id)
    metadata = getattr(result.user, "user_metadata", {}) or {}

    memberships = _ensure_business_membership_context(
        user_id=user_id,
        email=result.user.email or normalized_email,
        full_name=metadata.get("full_name", ""),
    )

    current_business_id = memberships[0]["business_id"] if memberships else None
    return {
        "user_id": user_id,
        "email": result.user.email,
        "full_name": metadata.get("full_name", ""),
        "access_token": result.session.access_token,
        "refresh_token": result.session.refresh_token,
        "businesses": memberships,
        "current_business_id": current_business_id,
    }


def resend_verification_email(email: str) -> None:
    """Ask Supabase to resend the email confirmation link."""
    normalized_email = normalize_email(email)
    try:
        sb = get_supabase()
        sb.auth.resend({"type": "signup", "email": normalized_email})
    except Exception as exc:
        message = _extract_error_message(exc)
        raise _http_error(400, "RESEND_FAILED", f"Could not resend verification email: {message}") from exc


def refresh_session(refresh_token: str) -> dict[str, Any]:
    """Refresh an expired access token with a refresh token."""
    token = (refresh_token or "").strip()
    if not token:
        raise _http_error(401, "SESSION_EXPIRED", "Session expired. Please sign in again.")

    sb = get_supabase()
    try:
        try:
            result = sb.auth.refresh_session(token)
        except TypeError:
            result = sb.auth.refresh_session({"refresh_token": token})
    except Exception as exc:
        raise _map_auth_error(exc, "refresh") from exc

    if not result.session or not result.user:
        raise _http_error(401, "SESSION_EXPIRED", "Session expired. Please sign in again.")

    memberships = _list_memberships(str(result.user.id))
    current_business_id = memberships[0]["business_id"] if memberships else None
    metadata = getattr(result.user, "user_metadata", {}) or {}

    return {
        "user_id": str(result.user.id),
        "email": result.user.email,
        "full_name": metadata.get("full_name", ""),
        "access_token": result.session.access_token,
        "refresh_token": result.session.refresh_token,
        "businesses": memberships,
        "current_business_id": current_business_id,
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
    working_hours: Optional[dict] = None,
) -> dict[str, Any]:
    """Create a new business and assign the user as owner."""
    sb = get_supabase()
    _ensure_profile_exists(user_id)

    now = datetime.now().isoformat()
    default_hours = {
        "monday": "9:00 AM - 6:00 PM",
        "tuesday": "9:00 AM - 6:00 PM",
        "wednesday": "9:00 AM - 6:00 PM",
        "thursday": "9:00 AM - 6:00 PM",
        "friday": "9:00 AM - 6:00 PM",
        "saturday": "10:00 AM - 4:00 PM",
        "sunday": "Closed",
    }

    resolved_email = (email or "").strip()
    if not resolved_email:
        try:
            profile_lookup = sb.table("profiles").select("email").eq("id", user_id).limit(1).execute()
            if profile_lookup.data and profile_lookup.data[0].get("email"):
                resolved_email = str(profile_lookup.data[0]["email"]).strip().lower()
        except Exception:
            resolved_email = ""

    biz_data = {
        "name": _normalize_business_name(business_name),
        "phone": (phone or "").strip(),
        "email": resolved_email,
        "address": (address or "").strip(),
        "timezone": (timezone or "Asia/Karachi").strip() or "Asia/Karachi",
        "greeting_message": (greeting_message or "").strip()
        or "Thank you for calling. How may I assist you today?",
        "working_hours": working_hours or default_hours,
        "created_at": now,
        "updated_at": now,
    }

    result = sb.table("businesses").insert(biz_data).execute()
    business = result.data[0]

    try:
        sb.table("business_memberships").insert({
            "user_id": user_id,
            "business_id": business["id"],
            "role": "owner",
        }).execute()
    except Exception as exc:
        # Best-effort cleanup to avoid orphaned businesses if membership insert fails.
        try:
            sb.table("businesses").delete().eq("id", business["id"]).execute()
        except Exception:
            pass

        message = _extract_error_message(exc).lower()
        if "foreign key" in message:
            raise _http_error(409, "USER_ALREADY_EXISTS", "An account with this email already exists. Please sign in.") from exc
        if "duplicate" in message or "unique" in message:
            raise _http_error(409, "BUSINESS_MEMBERSHIP_EXISTS", "This account is already linked to the business.") from exc
        raise _http_error(400, "BUSINESS_CREATE_FAILED", "Unable to complete business setup during signup.") from exc

    return business


def add_business_member(business_id: str, email: str, role: str = "staff") -> dict[str, Any]:
    """Add a user to a business by email. The target user must already exist."""
    normalized_role = (role or "staff").strip().lower()
    if normalized_role not in _ALLOWED_ROLES:
        raise _http_error(422, "INVALID_ROLE", "Role must be one of: owner, admin, staff.")

    sb = get_supabase()
    profile = sb.table("profiles").select("id").eq("email", normalize_email(email)).limit(1).execute()
    if not profile.data:
        raise _http_error(404, "USER_NOT_FOUND", "No user found with that email.")

    target_user_id = profile.data[0]["id"]
    try:
        sb.table("business_memberships").insert({
            "user_id": target_user_id,
            "business_id": business_id,
            "role": normalized_role,
        }).execute()
    except Exception as exc:
        message = _extract_error_message(exc)
        if "duplicate" in message.lower() or "unique" in message.lower():
            raise _http_error(409, "MEMBERSHIP_EXISTS", "User is already a member of this business.") from exc
        raise _http_error(400, "MEMBERSHIP_ADD_FAILED", f"Unable to add member: {message}") from exc

    return {"user_id": target_user_id, "business_id": business_id, "role": normalized_role}


def get_user_profile(user_id: str) -> dict[str, Any]:
    """Return profile and business memberships for the authenticated user."""
    sb = get_supabase()

    profile_result = sb.table("profiles").select("*").eq("id", user_id).limit(1).execute()
    profile = profile_result.data[0] if profile_result.data else None

    if not profile:
        _ensure_profile_exists(user_id)
        profile_result = sb.table("profiles").select("*").eq("id", user_id).limit(1).execute()
        profile = profile_result.data[0] if profile_result.data else None

    if profile and profile.get("email"):
        businesses = _ensure_business_membership_context(
            user_id=user_id,
            email=profile["email"],
            full_name=profile.get("full_name", ""),
        )
    else:
        businesses = _list_memberships(user_id)

    return {
        "user_id": user_id,
        "profile": profile,
        "businesses": businesses,
        "current_business_id": businesses[0]["business_id"] if businesses else None,
    }


def update_user_profile(user_id: str, full_name: Optional[str], email: Optional[str]) -> dict[str, Any]:
    """Update authenticated user profile fields in Supabase Auth + profiles table."""
    sb = get_supabase()

    existing = get_user_profile(user_id).get("profile")
    if not existing:
        raise _http_error(404, "PROFILE_NOT_FOUND", "Profile not found for this account.")

    new_full_name = (full_name or "").strip() if full_name is not None else existing.get("full_name", "")
    new_email = normalize_email(email) if email is not None else existing.get("email", "")

    updates: dict[str, Any] = {}
    if new_full_name != (existing.get("full_name") or ""):
        updates["full_name"] = new_full_name
    if new_email != existing.get("email"):
        updates["email"] = new_email

    if not updates:
        raise _http_error(400, "NO_PROFILE_CHANGES", "No profile changes submitted.")

    auth_updates: dict[str, Any] = {}
    if "email" in updates:
        auth_updates["email"] = updates["email"]
    if "full_name" in updates:
        auth_updates["user_metadata"] = {"full_name": updates["full_name"]}

    if auth_updates:
        try:
            sb.auth.admin.update_user_by_id(user_id, auth_updates)
        except Exception as exc:
            raise _map_auth_error(exc, "profile_update") from exc

    try:
        sb.table("profiles").update(updates).eq("id", user_id).execute()
    except Exception as exc:
        raise _map_auth_error(exc, "profile_update") from exc

    return get_user_profile(user_id)


def update_user_password(user_id: str, current_password: str, new_password: str) -> dict[str, Any]:
    """Change authenticated user password after current-password verification."""
    current = current_password or ""
    new_value = new_password or ""

    if not current:
        raise _http_error(422, "CURRENT_PASSWORD_REQUIRED", "Current password is required.")
    if current == new_value:
        raise _http_error(422, "PASSWORD_UNCHANGED", "New password must be different from current password.")

    validate_password_strength(new_value, field_name="new password")

    profile = get_user_profile(user_id).get("profile")
    if not profile or not profile.get("email"):
        raise _http_error(404, "PROFILE_NOT_FOUND", "Profile not found for this account.")

    # Verify current password using the regular auth flow.
    try:
        sign_in(profile["email"], current)
    except HTTPException as exc:
        if exc.status_code == 401:
            raise _http_error(401, "CURRENT_PASSWORD_INVALID", "Current password is incorrect.") from exc
        raise

    sb = get_supabase()
    try:
        sb.auth.admin.update_user_by_id(user_id, {"password": new_value})
    except Exception as exc:
        raise _map_auth_error(exc, "password_update") from exc

    return {"success": True, "message": "Password updated successfully."}


def session_cookie_names() -> dict[str, str]:
    """Expose cookie names to keep main.py cookie handling centralized and consistent."""
    return {
        "access": _ACCESS_COOKIE_NAME,
        "refresh": _REFRESH_COOKIE_NAME,
        "csrf": _CSRF_COOKIE_NAME,
    }
