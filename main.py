"""
FastAPI main application for the AI Voice Receptionist system.
Handles web chat, Vapi voice webhooks, billing, and clinic dashboard APIs.

Voice endpoints remain JWT-free webhook callbacks, but they require the
configured Vapi webhook secret.
"""
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import List, Optional, Tuple
import os
import secrets
import httpx
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel

from models import (
    ChatRequest,
    ChatResponse,
    BookingRequest,
    BookingResponse,
    Booking,
    Appointment,
    AppointmentCreate,
    CallLog,
    Caller
)
from receptionist import ReceptionistAI
from database import (
    init_database, create_booking, get_all_bookings,
    get_all_appointments, get_appointments_for_date, create_appointment,
    get_call_logs, get_available_slots, check_time_slot_available,
    get_caller_appointments, get_or_create_caller, update_appointment_status,
    create_call_log, update_call_log, AppointmentStatus, CallStatus
)
from config import load_config, get_config, get_server_config
from auth import (
    require_auth, require_business_access, require_business_admin,
    sign_up, sign_in, create_business_for_user, add_business_member,
    get_user_profile, update_user_profile, update_user_password,
    refresh_session, session_cookie_names, resend_verification_email
)
from tenant import get_business_config
from logging_config import configure_logging, get_logger
from billing import (
    create_checkout,
    get_subscription,
    is_subscription_active,
    pricing_plans,
    record_lemonsqueezy_webhook,
    verify_lemonsqueezy_signature,
)
from models import BusinessType
from vapi_agent import (
    build_assistant_payload,
    handle_tool_calls,
    provider_call_id,
    vapi_tool_payloads,
)
from vapi_client import VapiClient, VapiConfigError

logger = get_logger(__name__)


# ── Rate limiter ────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── FastAPI app ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Voice Receptionist API",
    description="Autonomous AI receptionist that handles phone calls and appointments",
    version="3.1.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — restrict to configured origins in production.
# Set ALLOWED_ORIGINS env var to a comma-separated list of origins, e.g.:
#   ALLOWED_ORIGINS=https://myapp.onrender.com,https://custom.domain.com
# Falls back to "*" when not set (dev/single-origin deployments).
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
_allowed_origins: list[str] = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Business-Id", "X-CSRF-Token"],
)

_allowed_hosts = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()]
if _allowed_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(self), geolocation=()")
    if _cookie_secure():
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


# Configure structured logging before anything else
configure_logging()

# Load configuration (still used as fallback for single-tenant mode)
load_config()


# ============ Static Files & Frontend (React SPA) ============

FRONTEND_DIR = Path(__file__).parent / "frontend" / "dist"

# Mount Vite-built static assets (JS, CSS, images, etc.)
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="static-assets")


# ============ Auth Endpoints ============

class SignUpRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""
    business_name: str
    business_type: BusinessType = BusinessType.MEDICAL_CLINIC

class SignInRequest(BaseModel):
    email: str
    password: str

class ResendVerificationRequest(BaseModel):
    email: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None


class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class CreateBusinessRequest(BaseModel):
    business_name: str
    phone: str = ""
    email: str = ""
    address: str = ""
    timezone: str = "America/New_York"
    greeting_message: str = ""
    working_hours: Optional[dict] = None
    business_type: BusinessType = BusinessType.MEDICAL_CLINIC

class UpdateBusinessRequest(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    greeting_message: Optional[str] = None
    working_hours: Optional[dict] = None
    business_type: Optional[BusinessType] = None

class CreateServiceRequest(BaseModel):
    name: str
    price: float
    duration: int = 30
    description: str = ""

class UpdateServiceRequest(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    duration: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class AddMemberRequest(BaseModel):
    email: str
    role: str = "staff"


class BillingCheckoutRequest(BaseModel):
    email: str = ""


class VoiceProvisionRequest(BaseModel):
    area_code: str


class AiReceptionistSettingsRequest(BaseModel):
    greeting: str = ""
    tone: str = "warm, calm, and professional"
    appointment_duration_minutes: int = 30
    appointment_buffer_minutes: int = 0
    transfer_phone: str = ""
    emergency_escalation_text: str = "If this is a medical emergency, please hang up and call 911."


class TestCallRequest(BaseModel):
    customer_phone: str


class DemoCallRequest(BaseModel):
    customer_phone: str
    consent: bool = False


class DemoWebCallConfig(BaseModel):
    public_key: str
    assistant_id: str
    business_id: str


_SESSION_COOKIES = session_cookie_names()


def _cookie_secure() -> bool:
    return os.getenv("COOKIE_SECURE", "false").strip().lower() in {"1", "true", "yes", "on"}


def _cookie_samesite() -> str:
    value = os.getenv("COOKIE_SAMESITE", "lax").strip().lower()
    if value not in {"lax", "strict", "none"}:
        return "lax"
    return value


def _set_session_cookies(response: Response, auth_result: dict) -> None:
    secure = _cookie_secure()
    same_site = _cookie_samesite()

    access_token = auth_result.get("access_token")
    refresh_token = auth_result.get("refresh_token")

    if access_token:
        response.set_cookie(
            key=_SESSION_COOKIES["access"],
            value=access_token,
            httponly=True,
            secure=secure,
            samesite=same_site,
            max_age=int(os.getenv("ACCESS_COOKIE_MAX_AGE", "3600")),
            path="/",
        )

    if refresh_token:
        response.set_cookie(
            key=_SESSION_COOKIES["refresh"],
            value=refresh_token,
            httponly=True,
            secure=secure,
            samesite=same_site,
            max_age=int(os.getenv("REFRESH_COOKIE_MAX_AGE", "2592000")),
            path="/",
        )

    response.set_cookie(
        key=_SESSION_COOKIES["csrf"],
        value=secrets.token_urlsafe(32),
        httponly=False,
        secure=secure,
        samesite=same_site,
        max_age=int(os.getenv("REFRESH_COOKIE_MAX_AGE", "2592000")),
        path="/",
    )


def _clear_session_cookies(response: Response) -> None:
    secure = _cookie_secure()
    same_site = _cookie_samesite()
    for cookie_name in _SESSION_COOKIES.values():
        response.delete_cookie(cookie_name, path="/", samesite=same_site, secure=secure)


def _csrf_valid(request: Request) -> bool:
    csrf_cookie = request.cookies.get(_SESSION_COOKIES["csrf"], "")
    csrf_header = request.headers.get("x-csrf-token", "")
    return bool(csrf_cookie and csrf_header and csrf_cookie == csrf_header)


def _public_auth_payload(auth_result: dict) -> dict:
    businesses = auth_result.get("businesses", [])
    return {
        "success": True,
        "user": {
            "user_id": auth_result.get("user_id"),
            "email": auth_result.get("email"),
            "full_name": auth_result.get("full_name", ""),
        },
        "businesses": businesses,
        "current_business_id": auth_result.get("current_business_id"),
        "needs_email_verification": bool(auth_result.get("needs_email_verification", False)),
    }


@app.post("/auth/signup")
@limiter.limit("10/minute")
async def auth_signup(request: Request, response: Response, req: SignUpRequest):
    """Register a new user, auto-create their business, and start a secure session when available."""
    try:
        result = sign_up(req.email, req.password, req.full_name)

        business = create_business_for_user(
            user_id=result["user_id"],
            business_name=req.business_name,
            email=req.email,
            business_type=req.business_type.value,
        )
        result["businesses"] = [
            {
                "business_id": business["id"],
                "role": "owner",
                "business_name": business["name"],
                "business_type": business.get("business_type"),
                "hipaa_mode": business.get("hipaa_mode", False),
                "billing_status": business.get("billing_status", "pending"),
            }
        ]
        result["current_business_id"] = business["id"]

        if result.get("access_token") and result.get("refresh_token"):
            _set_session_cookies(response, result)

        return _public_auth_payload(result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Signup failed")
        raise HTTPException(
            status_code=500,
            detail={
                "code": "SIGNUP_FAILED",
                "message": "Unable to complete sign up right now. Please try again.",
            },
        ) from exc


@app.post("/auth/signin")
@limiter.limit("20/minute")
async def auth_signin(request: Request, response: Response, req: SignInRequest):
    """Sign in, set secure session cookies, and return user/business context."""
    try:
        result = sign_in(req.email, req.password)
        _set_session_cookies(response, result)
        return _public_auth_payload(result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Signin failed")
        raise HTTPException(
            status_code=500,
            detail={
                "code": "SIGNIN_FAILED",
                "message": "Unable to sign in right now. Please try again.",
            },
        ) from exc


@app.post("/auth/resend-verification")
@limiter.limit("2/minute")
async def auth_resend_verification(request: Request, req: ResendVerificationRequest):
    """Resend email verification link. Rate-limited to prevent abuse."""
    try:
        resend_verification_email(req.email)
        return {"success": True, "message": "Verification email sent. Please check your inbox."}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Resend verification failed")
        raise HTTPException(
            status_code=500,
            detail={"code": "RESEND_FAILED", "message": "Unable to resend verification email."},
        ) from exc


@app.post("/auth/refresh")
@limiter.limit("30/minute")
async def auth_refresh(request: Request, response: Response):
    """Refresh access session using secure refresh-token cookie."""
    if not _csrf_valid(request):
        raise HTTPException(
            status_code=403,
            detail={"code": "CSRF_TOKEN_INVALID", "message": "Security verification failed."},
        )

    refresh_token_value = request.cookies.get(_SESSION_COOKIES["refresh"], "")
    result = refresh_session(refresh_token_value)
    _set_session_cookies(response, result)
    return _public_auth_payload(result)


@app.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    """Clear all auth/session cookies and terminate dashboard session."""
    csrf_cookie = request.cookies.get(_SESSION_COOKIES["csrf"], "")
    if csrf_cookie and not _csrf_valid(request):
        raise HTTPException(
            status_code=403,
            detail={"code": "CSRF_TOKEN_INVALID", "message": "Security verification failed."},
        )

    _clear_session_cookies(response)
    return {"success": True, "message": "Logged out successfully."}


@app.get("/auth/me")
async def auth_me(user_id: str = Depends(require_auth)):
    """Get current user profile and memberships for dashboard identity/status."""
    profile_data = get_user_profile(user_id)
    return {"success": True, **profile_data}


@app.patch("/auth/profile")
async def auth_profile_update(req: UpdateProfileRequest, user_id: str = Depends(require_auth)):
    """Update current user's profile details (name/email)."""
    updated = update_user_profile(user_id, req.full_name, req.email)
    return {"success": True, **updated}


@app.patch("/auth/password")
async def auth_password_update(req: UpdatePasswordRequest, user_id: str = Depends(require_auth)):
    """Change current user's password."""
    result = update_user_password(user_id, req.current_password, req.new_password)
    return result


@app.post("/auth/business")
async def create_business(req: CreateBusinessRequest, user_id: str = Depends(require_auth)):
    """Create a new business and assign current user as owner."""
    try:
        business = create_business_for_user(
            user_id=user_id,
            business_name=req.business_name,
            phone=req.phone,
            email=req.email,
            address=req.address,
            timezone=req.timezone,
            greeting_message=req.greeting_message,
            working_hours=req.working_hours,
            business_type=req.business_type.value,
        )
        return {"success": True, "business": business}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/business/members")
async def add_member(
    req: AddMemberRequest,
    access: Tuple[str, str] = Depends(require_business_admin)
):
    """Add a member to the business (requires owner/admin)."""
    user_id, business_id = access
    try:
        result = add_business_member(business_id, req.email, req.role)
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ Pricing & Billing Endpoints ============

@app.get("/pricing/plans")
async def get_pricing_plans():
    return {"success": True, "plans": pricing_plans()}


@app.post("/billing/checkout")
@limiter.limit("10/minute")
async def billing_checkout(
    request: Request,
    req: BillingCheckoutRequest,
    access: Tuple[str, str] = Depends(require_business_admin),
):
    user_id, business_id = access
    try:
        email = req.email
        if not email:
            profile = get_user_profile(user_id).get("profile", {})
            email = profile.get("email", "")
        checkout = await create_checkout(business_id, email)
        return {"success": True, **checkout}
    except httpx.HTTPStatusError as exc:
        logger.error("Lemon Squeezy checkout failed: %s", exc.response.text)
        raise HTTPException(status_code=502, detail="Unable to create billing checkout.") from exc
    except Exception as exc:
        logger.exception("Billing checkout failed")
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/billing/subscription")
async def billing_subscription(access: Tuple[str, str] = Depends(require_business_access)):
    _, business_id = access
    return {"success": True, "subscription": get_subscription(business_id)}


@app.post("/webhooks/lemonsqueezy")
@limiter.limit("60/minute")
async def lemonsqueezy_webhook(request: Request):
    raw_body = await request.body()
    signature = request.headers.get("x-signature", "")
    if not verify_lemonsqueezy_signature(raw_body, signature):
        raise HTTPException(status_code=401, detail="Invalid Lemon Squeezy signature.")

    payload = await request.json()
    try:
        result = record_lemonsqueezy_webhook(payload)
        return {"success": True, **result}
    except Exception as exc:
        logger.exception("Unable to process Lemon Squeezy webhook")
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ============ Business Settings Endpoints ============
# All require JWT + business membership. Admin/owner for writes.

@app.get("/business/settings")
async def get_business_settings(
    access: Tuple[str, str] = Depends(require_business_access)
):
    """Get full business settings (requires membership)."""
    _, business_id = access
    from supabase_client import get_supabase
    sb = get_supabase()

    biz = sb.table("businesses").select("*").eq("id", business_id).execute()
    if not biz.data:
        raise HTTPException(status_code=404, detail="Business not found")

    row = biz.data[0]
    row["business_name"] = row.get("name", "")
    return {"success": True, "settings": row}


@app.patch("/business/settings")
async def update_business_settings(
    req: UpdateBusinessRequest,
    access: Tuple[str, str] = Depends(require_business_admin)
):
    """Update business settings (requires owner/admin)."""
    _, business_id = access
    from supabase_client import get_supabase
    sb = get_supabase()

    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if "business_name" in updates:
        updates["name"] = updates.pop("business_name")
    if "business_type" in updates and hasattr(updates["business_type"], "value"):
        updates["business_type"] = updates["business_type"].value

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    sb.table("businesses").update(updates).eq("id", business_id).execute()

    # Invalidate config cache so voice/chat picks up changes immediately
    from tenant import invalidate_config_cache
    invalidate_config_cache(business_id)

    return {"success": True, "message": "Business settings updated"}


@app.get("/business/services")
async def list_business_services(
    access: Tuple[str, str] = Depends(require_business_access)
):
    """List all services for the business (including inactive)."""
    _, business_id = access
    from supabase_client import get_supabase
    sb = get_supabase()

    result = sb.table("services").select("*").eq(
        "business_id", business_id
    ).order("name").execute()

    services = []
    for service in result.data:
        services.append({**service, "duration_minutes": service.get("duration")})
    return {"success": True, "services": services}


@app.post("/business/services")
async def create_business_service(
    req: CreateServiceRequest,
    access: Tuple[str, str] = Depends(require_business_admin)
):
    """Add a new service to the business (requires owner/admin)."""
    _, business_id = access
    from supabase_client import get_supabase
    sb = get_supabase()

    result = sb.table("services").insert({
        "business_id": business_id,
        "name": req.name,
        "price": req.price,
        "duration": req.duration,
        "description": req.description,
    }).execute()

    from tenant import invalidate_config_cache
    invalidate_config_cache(business_id)

    return {"success": True, "service": result.data[0]}


@app.patch("/business/services/{service_id}")
async def update_business_service(
    service_id: str,
    req: UpdateServiceRequest,
    access: Tuple[str, str] = Depends(require_business_admin)
):
    """Update a service (requires owner/admin)."""
    _, business_id = access
    from supabase_client import get_supabase
    sb = get_supabase()

    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    sb.table("services").update(updates).eq(
        "id", service_id
    ).eq("business_id", business_id).execute()

    from tenant import invalidate_config_cache
    invalidate_config_cache(business_id)

    return {"success": True, "message": "Service updated"}


@app.delete("/business/services/{service_id}")
async def delete_business_service(
    service_id: str,
    access: Tuple[str, str] = Depends(require_business_admin)
):
    """Delete a service (requires owner/admin). Actually soft-deletes by setting is_active=false."""
    _, business_id = access
    from supabase_client import get_supabase
    sb = get_supabase()

    sb.table("services").update({"is_active": False}).eq(
        "id", service_id
    ).eq("business_id", business_id).execute()

    from tenant import invalidate_config_cache
    invalidate_config_cache(business_id)

    return {"success": True, "message": "Service deactivated"}


# ============ Vapi AI Receptionist Endpoints ============

def _public_base_url(request: Request) -> str:
    forwarded_host = request.headers.get("x-forwarded-host", "").strip()
    forwarded_proto = request.headers.get("x-forwarded-proto", "").strip() or request.url.scheme
    if forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}".rstrip("/")
    server_url = os.getenv("SERVER_URL", "").strip().rstrip("/")
    if server_url:
        return server_url
    return str(request.base_url).rstrip("/")


def _vapi_webhook_authorized(request: Request) -> bool:
    expected = os.getenv("VAPI_WEBHOOK_SECRET", "").strip()
    if not expected:
        return False
    supplied = request.headers.get("x-vapi-secret", "").strip()
    if supplied and secrets.compare_digest(supplied, expected):
        return True
    auth = request.headers.get("authorization", "").strip()
    if auth.lower().startswith("bearer "):
        return secrets.compare_digest(auth.split(" ", 1)[1].strip(), expected)
    return False


def _normalize_area_code(value: str) -> str:
    area_code = "".join(ch for ch in value if ch.isdigit())
    if len(area_code) != 3:
        raise HTTPException(status_code=422, detail="US area code must be exactly 3 digits.")
    return area_code


def _default_ai_settings() -> dict:
    return {
        "greeting": "Thank you for calling. How may I help you today?",
        "tone": "warm, calm, and professional",
        "appointment_duration_minutes": 30,
        "appointment_buffer_minutes": 0,
        "transfer_phone": "",
        "emergency_escalation_text": "If this is a medical emergency, please hang up and call 911.",
    }


def _get_ai_settings(business_id: str) -> dict:
    from supabase_client import get_supabase
    sb = get_supabase()
    result = sb.table("ai_receptionist_settings").select("*").eq(
        "business_id", business_id
    ).limit(1).execute()
    if result.data:
        return {**_default_ai_settings(), **result.data[0]}
    defaults = {"business_id": business_id, **_default_ai_settings()}
    sb.table("ai_receptionist_settings").insert(defaults).execute()
    return defaults


def _billing_allows_voice(business_id: str) -> bool:
    if os.getenv("BYPASS_BILLING_FOR_DEMO", "false").lower() in {"1", "true", "yes", "on"}:
        return True
    subscription = get_subscription(business_id)
    return is_subscription_active(subscription.get("status"))


def _normalize_customer_phone(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        raise HTTPException(status_code=422, detail="Enter the phone number to call.")

    prefix = "+" if raw.startswith("+") else ""
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        raise HTTPException(status_code=422, detail="Enter a valid phone number.")

    if prefix:
        phone = f"+{digits}"
    elif len(digits) == 10:
        phone = f"+1{digits}"
    elif len(digits) == 11 and digits.startswith("1"):
        phone = f"+{digits}"
    elif digits.startswith("00") and len(digits) > 8:
        phone = f"+{digits[2:]}"
    else:
        raise HTTPException(status_code=422, detail="Use E.164 format, for example +14155551212.")

    normalized_digits = phone[1:]
    if len(normalized_digits) < 8 or len(normalized_digits) > 15:
        raise HTTPException(status_code=422, detail="Use E.164 format, for example +14155551212.")
    return phone


def _landing_demo_assistant_config() -> tuple[str, str, dict]:
    business_id = os.getenv("VAPI_DEMO_BUSINESS_ID", "00000000-0000-0000-0000-000000000001").strip()
    assistant_id = os.getenv("VAPI_DEMO_ASSISTANT_ID", "").strip()
    row: dict = {}

    if assistant_id:
        return business_id, assistant_id, row

    try:
        from supabase_client import get_supabase

        voice = get_supabase().table("vapi_phone_numbers").select("*").eq(
            "business_id", business_id
        ).in_("status", ["active", "provisioning"]).limit(1).execute()
    except Exception:
        logger.warning("Unable to load landing demo Vapi config", exc_info=True)
        voice = None

    if voice and voice.data:
        row = voice.data[0]
        assistant_id = assistant_id or (row.get("vapi_assistant_id") or "")

    if not assistant_id:
        raise HTTPException(
            status_code=503,
            detail="Demo calling is not configured yet. Set VAPI_DEMO_ASSISTANT_ID or provision the demo business voice line.",
        )
    return business_id, assistant_id, row


def _landing_demo_voice_config() -> tuple[str, str, str]:
    business_id, assistant_id, row = _landing_demo_assistant_config()
    phone_number_id = os.getenv("VAPI_DEMO_PHONE_NUMBER_ID", "").strip() or (row.get("vapi_phone_number_id") or "")
    if not phone_number_id:
        raise HTTPException(
            status_code=503,
            detail="Phone demo calling is not configured yet. Set VAPI_DEMO_PHONE_NUMBER_ID or provision the demo business voice line.",
        )
    return business_id, assistant_id, phone_number_id


async def _ensure_vapi_tools(
    client: VapiClient,
    server_url: str,
    existing_tool_ids: Optional[list[str]],
) -> list[str]:
    if existing_tool_ids:
        return existing_tool_ids
    tool_ids = []
    payloads = vapi_tool_payloads(server_url)
    for payload in payloads:
        tool = await client.create_tool(payload)
        if tool.get("id"):
            tool_ids.append(tool["id"])
    if len(tool_ids) != len(payloads):
        raise RuntimeError("Unable to create all Vapi tools.")
    return tool_ids


@app.get("/business/ai-settings")
async def get_ai_settings(access: Tuple[str, str] = Depends(require_business_access)):
    _, business_id = access
    return {"success": True, "settings": _get_ai_settings(business_id)}


@app.patch("/business/ai-settings")
async def update_ai_settings(
    req: AiReceptionistSettingsRequest,
    request: Request,
    access: Tuple[str, str] = Depends(require_business_admin),
):
    _, business_id = access
    from supabase_client import get_supabase
    from tenant import invalidate_config_cache

    sb = get_supabase()
    existing = sb.table("ai_receptionist_settings").select("business_id").eq(
        "business_id", business_id
    ).limit(1).execute()
    payload = {"business_id": business_id, **req.model_dump(), "updated_at": datetime.now().isoformat()}
    if existing.data:
        sb.table("ai_receptionist_settings").update(payload).eq("business_id", business_id).execute()
    else:
        sb.table("ai_receptionist_settings").insert(payload).execute()

    voice = sb.table("vapi_phone_numbers").select("*").eq("business_id", business_id).limit(1).execute()
    if voice.data and voice.data[0].get("vapi_assistant_id"):
        try:
            await VapiClient().update_assistant(
                voice.data[0]["vapi_assistant_id"],
                build_assistant_payload(
                    business_id,
                    payload,
                    _public_base_url(request),
                    voice.data[0].get("vapi_tool_ids") or [],
                ),
            )
        except Exception:
            logger.warning("Unable to update Vapi assistant after settings change", exc_info=True)

    invalidate_config_cache(business_id)
    return {"success": True, "settings": payload}


@app.get("/business/voice")
async def get_business_voice(access: Tuple[str, str] = Depends(require_business_access)):
    _, business_id = access
    from supabase_client import get_supabase

    voice = get_supabase().table("vapi_phone_numbers").select("*").eq(
        "business_id", business_id
    ).limit(1).execute()
    return {
        "success": True,
        "voice": voice.data[0] if voice.data else None,
        "subscription": get_subscription(business_id),
        "settings": _get_ai_settings(business_id),
    }


@app.post("/business/voice/provision")
@limiter.limit("5/minute")
async def provision_vapi_voice(
    request: Request,
    req: VoiceProvisionRequest,
    access: Tuple[str, str] = Depends(require_business_admin),
):
    _, business_id = access
    if not _billing_allows_voice(business_id):
        raise HTTPException(status_code=402, detail="Activate billing before provisioning a Vapi number.")

    from supabase_client import get_supabase
    sb = get_supabase()
    area_code = _normalize_area_code(req.area_code)
    server_url = _public_base_url(request)
    settings = _get_ai_settings(business_id)

    current = sb.table("vapi_phone_numbers").select("*").eq("business_id", business_id).limit(1).execute()
    row = current.data[0] if current.data else {}

    try:
        client = VapiClient()
        tool_ids = await _ensure_vapi_tools(client, server_url, row.get("vapi_tool_ids"))
        assistant_payload = build_assistant_payload(business_id, settings, server_url, tool_ids)

        if row.get("vapi_assistant_id"):
            assistant = await client.update_assistant(row["vapi_assistant_id"], assistant_payload)
        else:
            assistant = await client.create_assistant(assistant_payload)
        assistant_id = assistant.get("id") or row.get("vapi_assistant_id")
        if not assistant_id:
            raise RuntimeError("Vapi did not return an assistant id.")

        if row.get("vapi_phone_number_id"):
            phone = row
            await client.update_phone_number(row["vapi_phone_number_id"], {
                "assistantId": assistant_id,
                "server": assistant_payload["server"],
            })
        else:
            phone = await client.create_phone_number({
                "provider": "vapi",
                "numberDesiredAreaCode": area_code,
                "assistantId": assistant_id,
                "name": f"Receptrix clinic line {business_id[:8]}",
                "server": assistant_payload["server"],
            })

        phone_number = phone.get("number") or row.get("phone_number")
        phone_id = phone.get("id") or row.get("vapi_phone_number_id")
        upsert_row = {
            "business_id": business_id,
            "vapi_assistant_id": assistant_id,
            "vapi_phone_number_id": phone_id,
            "phone_number": phone_number,
            "area_code": area_code,
            "status": "active",
            "vapi_tool_ids": tool_ids,
            "hipaa_enabled": True,
            "updated_at": datetime.now().isoformat(),
        }
        if current.data:
            sb.table("vapi_phone_numbers").update(upsert_row).eq("business_id", business_id).execute()
        else:
            sb.table("vapi_phone_numbers").insert(upsert_row).execute()

        if phone_number:
            sb.table("phone_number_mappings").upsert({
                "business_id": business_id,
                "phone_number": phone_number,
                "provider": "vapi",
                "label": "Vapi clinic reception line",
                "is_active": True,
            }, on_conflict="phone_number").execute()

        return {"success": True, "voice": upsert_row}
    except VapiConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        logger.error("Vapi provisioning failed: %s", exc.response.text)
        raise HTTPException(status_code=502, detail="Vapi provisioning failed.") from exc
    except Exception as exc:
        logger.exception("Vapi provisioning failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/business/voice/test-call")
@limiter.limit("5/minute")
async def start_vapi_test_call(
    request: Request,
    req: TestCallRequest,
    access: Tuple[str, str] = Depends(require_business_admin),
):
    _, business_id = access
    if not _billing_allows_voice(business_id):
        raise HTTPException(status_code=402, detail="Activate billing before running test calls.")

    from supabase_client import get_supabase
    sb = get_supabase()
    voice = sb.table("vapi_phone_numbers").select("*").eq("business_id", business_id).limit(1).execute()
    if not voice.data:
        raise HTTPException(status_code=400, detail="Provision a Vapi number first.")
    row = voice.data[0]

    try:
        call = await VapiClient().create_call({
            "assistantId": row["vapi_assistant_id"],
            "phoneNumberId": row["vapi_phone_number_id"],
            "customer": {"number": req.customer_phone},
            "assistantOverrides": {
                "firstMessage": "This is a Receptrix demo call. I can help schedule a test appointment using fake patient data."
            },
            "metadata": {"receptrix_business_id": business_id, "demo_call": "true"},
        })
        return {"success": True, "call": call}
    except httpx.HTTPStatusError as exc:
        logger.error("Vapi test call failed: %s", exc.response.text)
        raise HTTPException(status_code=502, detail="Unable to start Vapi test call.") from exc
    except Exception as exc:
        logger.exception("Vapi test call failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/demo/call")
@limiter.limit("3/minute")
async def start_landing_demo_call(request: Request, req: DemoCallRequest):
    if not req.consent:
        raise HTTPException(status_code=422, detail="Confirm consent to receive one automated demo call.")

    customer_phone = _normalize_customer_phone(req.customer_phone)
    business_id, assistant_id, phone_number_id = _landing_demo_voice_config()

    try:
        call = await VapiClient().create_call({
            "assistantId": assistant_id,
            "phoneNumberId": phone_number_id,
            "customer": {"number": customer_phone},
            "assistantOverrides": {
                "firstMessage": (
                    "Hi, this is Receptrix calling with your live AI receptionist demo. "
                    "Please use fake patient details during this demo, and I can show you how I answer questions, "
                    "check availability, and book a test appointment."
                )
            },
            "metadata": {
                "receptrix_business_id": business_id,
                "source": "landing_page_demo",
                "demo_call": "true",
            },
        })
        return {
            "success": True,
            "message": "Demo call started. Receptrix should call this number shortly.",
            "call_id": call.get("id"),
        }
    except VapiConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        logger.error("Landing demo Vapi call failed: %s", exc.response.text)
        raise HTTPException(status_code=502, detail="Unable to start the demo call right now.") from exc
    except Exception as exc:
        logger.exception("Landing demo Vapi call failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/demo/web-call-config", response_model=DemoWebCallConfig)
@limiter.limit("30/minute")
async def get_landing_demo_web_call_config(request: Request):
    public_key = (
        os.getenv("VAPI_PUBLIC_KEY", "").strip()
        or os.getenv("VAPI_WEB_PUBLIC_KEY", "").strip()
    )
    if not public_key:
        raise HTTPException(status_code=503, detail="Vapi public key is not configured yet.")

    business_id, assistant_id, _ = _landing_demo_assistant_config()
    return {
        "public_key": public_key,
        "assistant_id": assistant_id,
        "business_id": business_id,
    }


@app.post("/webhooks/vapi")
@limiter.limit("120/minute")
async def vapi_webhook(request: Request):
    if not _vapi_webhook_authorized(request):
        raise HTTPException(status_code=401, detail="Invalid Vapi webhook secret.")

    payload = await request.json()
    message = payload.get("message", payload)
    message_type = message.get("type") if isinstance(message, dict) else None

    if message_type == "tool-calls":
        return JSONResponse(handle_tool_calls(payload))

    if isinstance(message, dict):
        _record_vapi_call_event(message)
    return {"success": True}


def _record_vapi_call_event(message: dict[str, object]) -> None:
    try:
        from vapi_agent import resolve_business_from_vapi_message

        business_id = resolve_business_from_vapi_message(message)
        call_id = provider_call_id(message)
        if not business_id or not call_id:
            return

        call = message.get("call", {}) if isinstance(message.get("call"), dict) else {}
        customer = call.get("customer", {}) if isinstance(call.get("customer"), dict) else {}
        caller_phone = customer.get("number") or call.get("customerNumber") or "unknown"
        status = str(message.get("status") or call.get("status") or "").lower()

        if message.get("type") == "status-update" and status in {"queued", "ringing", "in-progress", "in_progress"}:
            try:
                create_call_log(call_sid=call_id, caller_phone=caller_phone, business_id=business_id)
            except Exception:
                pass
            return

        if message.get("type") == "end-of-call-report" or status in {"ended", "completed", "failed"}:
            ended_reason = str(message.get("endedReason") or call.get("endedReason") or "")
            duration = message.get("durationSeconds") or call.get("durationSeconds")
            update_call_log(
                call_id,
                call_status=CallStatus.FAILED if "fail" in ended_reason.lower() else CallStatus.COMPLETED,
                ended_at=datetime.now(),
                duration_seconds=int(duration) if duration else None,
                transcript=None,
                summary=None,
            )
    except Exception:
        logger.warning("Unable to record Vapi call event", exc_info=True)


# ============ Chat Endpoints ============

@app.post("/chat", response_model=ChatResponse)
@limiter.limit("60/minute")
async def chat(
    request: Request,
    chat_request: ChatRequest,
    access: Tuple[str, str] = Depends(require_business_access),
):
    """
    Handle chat messages from signed-in users in a tenant-scoped context.
    """
    try:
        _, business_id = access
        receptionist = ReceptionistAI(business_id=business_id)

        result = receptionist.handle_message(
            message=chat_request.message,
            conversation_history=chat_request.conversation_history
        )

        return ChatResponse(
            message=result["message"],
            intent=result["intent"]
        )
    except HTTPException:
        raise
    except RuntimeError as e:
        error_message = str(e)
        status_code = 503 if "must be set" in error_message.lower() else 500
        return JSONResponse(
            status_code=status_code,
            content={"detail": f"Error processing chat: {error_message}"},
        )
    except Exception as e:
        logger.exception("Error processing chat")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error processing chat: {str(e)}"},
        )


# ============ Services Endpoints ============

@app.get("/services")
async def get_services(access: Tuple[str, str] = Depends(require_business_access)):
    """Get list of available services (tenant-aware)."""
    try:
        _, business_id = access
        config = get_business_config(business_id)
        return {
            "services": [
                {
                    "name": service.name,
                    "price": service.price,
                    "duration": service.duration,
                    "description": getattr(service, 'description', '')
                }
                for service in config.services
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving services: {str(e)}")


# ============ Booking/Appointment Endpoints ============

@app.post("/book", response_model=BookingResponse)
async def book_appointment(request: BookingRequest):
    """Create a new booking (legacy endpoint)."""
    try:
        config = get_config()
        service_names = [s.name for s in config.services]
        if request.service not in service_names:
            return BookingResponse(
                success=False,
                message=f"Service '{request.service}' not found. Available services: {', '.join(service_names)}"
            )

        booking_id = create_booking(
            name=request.name,
            service=request.service,
            date=request.date,
            time=request.time
        )

        return BookingResponse(
            success=True,
            message=f"Booking confirmed! Your appointment for {request.service} on {request.date} at {request.time} is scheduled.",
            booking_id=booking_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating booking: {str(e)}")


@app.post("/appointments")
async def create_new_appointment(
    data: AppointmentCreate,
    access: Tuple[str, str] = Depends(require_business_access),
):
    """Create a new appointment (tenant-aware)."""
    try:
        _, business_id = access
        config = get_business_config(business_id)

        # Find service and get duration
        service = None
        for s in config.services:
            if s.name.lower() == data.service_name.lower():
                service = s
                break

        if not service:
            raise HTTPException(
                status_code=400,
                detail=f"Service '{data.service_name}' not found"
            )

        # Check availability
        if not check_time_slot_available(data.appointment_date, data.appointment_time, service.duration, business_id=business_id):
            raise HTTPException(
                status_code=400,
                detail="Time slot not available"
            )

        # Get or create caller
        caller = get_or_create_caller(data.caller_phone, data.caller_name, business_id=business_id)

        appointment_id = create_appointment(data, caller.id, service.duration, business_id=business_id)

        return {
            "success": True,
            "appointment_id": appointment_id,
            "message": f"Appointment scheduled for {data.appointment_date} at {data.appointment_time}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/appointments")
async def list_appointments(
    date: Optional[str] = None,
    limit: int = 50,
    access: Tuple[str, str] = Depends(require_business_access),
):
    """Get appointments, optionally filtered by date (tenant-aware)."""
    try:
        _, business_id = access
        if date:
            appointments = get_appointments_for_date(date, business_id=business_id)
        else:
            appointments = get_all_appointments(limit, business_id=business_id)

        return {"appointments": [apt.model_dump() for apt in appointments]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/appointments/availability")
async def check_availability(
    date: str,
    service: Optional[str] = None,
    access: Tuple[str, str] = Depends(require_business_access),
):
    """Check available time slots for a date (tenant-aware)."""
    try:
        _, business_id = access
        config = get_business_config(business_id)

        # Get day of week
        from datetime import datetime
        day_name = datetime.strptime(date, "%Y-%m-%d").strftime("%A").lower()
        working_hours = getattr(config.working_hours, day_name, "Closed")

        if working_hours.lower() == "closed":
            return {"date": date, "available": False, "slots": [], "message": "Business is closed on this day"}

        # Get service duration
        duration = 30
        if service:
            for s in config.services:
                if s.name.lower() == service.lower():
                    duration = s.duration
                    break

        slots = get_available_slots(date, working_hours, duration, business_id=business_id)

        return {
            "date": date,
            "available": len(slots) > 0,
            "slots": slots,
            "working_hours": working_hours
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/appointments/{appointment_id}/status")
async def update_appointment(
    appointment_id: int,
    status: str,
    access: Tuple[str, str] = Depends(require_business_access),
):
    """Update appointment status."""
    try:
        _, business_id = access
        status_enum = AppointmentStatus(status)
        update_appointment_status(appointment_id, status_enum, business_id=business_id)
        return {"success": True, "message": f"Appointment status updated to {status}"}
    except ValueError as exc:
        if str(exc) == "Appointment not found":
            raise HTTPException(status_code=404, detail="Appointment not found") from exc
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}") from exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Legacy Bookings Endpoints ============

@app.get("/bookings", response_model=List[Booking])
async def get_bookings():
    """Get all bookings (legacy endpoint)."""
    try:
        bookings = get_all_bookings()
        return bookings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving bookings: {str(e)}")


# ============ Call Logs Endpoints ============

@app.get("/calls")
async def get_calls(
    limit: int = 50,
    access: Tuple[str, str] = Depends(require_business_access),
):
    """Get call logs (tenant-aware)."""
    try:
        _, business_id = access
        calls = get_call_logs(limit, business_id=business_id)
        return {"calls": [call.model_dump() for call in calls]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Config Endpoints ============

@app.get("/config")
async def get_business_config_endpoint(access: Tuple[str, str] = Depends(require_business_access)):
    """Get business configuration (tenant-aware)."""
    try:
        _, business_id = access
        config = get_business_config(business_id)
        return {
            "business_name": config.business_name,
            "working_hours": config.working_hours.model_dump(),
            "services": [
                {
                    "name": s.name,
                    "price": s.price,
                    "duration": s.duration
                }
                for s in config.services
            ],
            "contact_info": config.contact_info.model_dump(),
            "timezone": getattr(config, 'timezone', 'Asia/Karachi')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving config: {str(e)}")


# ============ Health Check ============

@app.get("/health")
async def health_check():
    """
    Health check for Render and operators.

    Local development stays permissive. When REQUIRE_PROD_READY=true, this
    endpoint fails fast on missing deployment, billing, voice, and security env.
    """
    checks: dict = {}
    overall_ok = True
    require_prod_ready = os.getenv("REQUIRE_PROD_READY", "false").strip().lower() in {"1", "true", "yes", "on"}

    # ── Supabase connectivity ───────────────────────────────────────────────
    try:
        from supabase_client import get_supabase
        sb = get_supabase()
        sb.table("businesses").select("id").limit(1).execute()
        checks["supabase"] = "ok"
    except Exception as exc:
        checks["supabase"] = f"error: {exc}"
        overall_ok = False

    # ── AI provider env ─────────────────────────────────────────────────────
    ai_provider = os.getenv("AI_PROVIDER", "groq").lower()
    provider_key_map = {
        "groq": "GROQ_API_KEY",
        "openai": "OPENAI_API_KEY",
        "huggingface": "HUGGINGFACE_API_KEY",
        "ollama": None,  # local; no key needed
    }
    required_key = provider_key_map.get(ai_provider)
    if required_key:
        checks["ai_provider"] = ai_provider if os.getenv(required_key) else f"missing {required_key}"
        if not os.getenv(required_key):
            overall_ok = False
    else:
        checks["ai_provider"] = ai_provider

    # ── Voice provider env ──────────────────────────────────────────────────
    voice_ok = bool(os.getenv("VAPI_API_KEY") and os.getenv("VAPI_WEBHOOK_SECRET"))
    checks["voice_provider"] = "vapi" if voice_ok else "vapi (credentials missing)"
    if require_prod_ready and not voice_ok:
        overall_ok = False

    web_demo_ok = bool(
        (os.getenv("VAPI_PUBLIC_KEY") or os.getenv("VAPI_WEB_PUBLIC_KEY"))
        and os.getenv("VAPI_DEMO_ASSISTANT_ID")
    )
    checks["web_voice_demo"] = "configured" if web_demo_ok else "missing VAPI_PUBLIC_KEY or VAPI_DEMO_ASSISTANT_ID"
    if require_prod_ready and not web_demo_ok:
        overall_ok = False

    billing_bypass = os.getenv("BYPASS_BILLING_FOR_DEMO", "false").strip().lower() in {"1", "true", "yes", "on"}
    missing_billing = [
        key for key in (
            "LEMONSQUEEZY_API_KEY",
            "LEMONSQUEEZY_STORE_ID",
            "LEMONSQUEEZY_MEDICAL_VARIANT_ID",
            "LEMONSQUEEZY_GENERAL_VARIANT_ID",
            "LEMONSQUEEZY_WEBHOOK_SECRET",
        )
        if not os.getenv(key)
    ]
    if missing_billing:
        checks["billing"] = f"missing {', '.join(missing_billing)}"
        if require_prod_ready:
            overall_ok = False
    elif billing_bypass:
        checks["billing"] = "demo billing bypass enabled"
        if require_prod_ready:
            overall_ok = False
    else:
        lemon_test = os.getenv("LEMONSQUEEZY_TEST_MODE", "true").strip().lower() in {"1", "true", "yes", "on"}
        checks["billing"] = f"lemonsqueezy ({'test' if lemon_test else 'live'})"

    if require_prod_ready:
        server_url = os.getenv("SERVER_URL", "").strip()
        allowed_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
        allowed_hosts = os.getenv("ALLOWED_HOSTS", "").strip()
        security_errors = []
        if not server_url.startswith("https://"):
            security_errors.append("SERVER_URL must be an https URL")
        if not allowed_origins or "*" in {part.strip() for part in allowed_origins.split(",")}:
            security_errors.append("ALLOWED_ORIGINS must be exact")
        if not allowed_hosts:
            security_errors.append("ALLOWED_HOSTS is required")
        if not _cookie_secure():
            security_errors.append("COOKIE_SECURE must be true")
        checks["production_config"] = "ok" if not security_errors else "; ".join(security_errors)
        if security_errors:
            overall_ok = False

    status = "healthy" if overall_ok else "degraded"
    response_body = {
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "version": "3.1.0",
        "checks": checks,
    }

    if not overall_ok:
        return JSONResponse(content=response_body, status_code=503)
    return response_body


# ============ Dashboard Stats ============

@app.get("/stats")
async def get_stats(access: Tuple[str, str] = Depends(require_business_access)):
    """Get dashboard statistics (tenant-aware)."""
    try:
        _, business_id = access
        appointments = get_all_appointments(100, business_id=business_id)
        calls = get_call_logs(100, business_id=business_id)

        today = datetime.now().strftime("%Y-%m-%d")
        today_appointments = [a for a in appointments if a.appointment_date == today]

        return {
            "total_appointments": len(appointments),
            "today_appointments": len(today_appointments),
            "total_calls": len(calls),
            "completed_calls": len([c for c in calls if c.call_status.value == "completed"]),
            "appointments_by_status": {
                status.value: len([a for a in appointments if a.status == status])
                for status in AppointmentStatus
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ SPA Catch-All (MUST be last route) ============

@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    """Serve React SPA index.html for all non-API routes (client-side routing)."""
    requested = (FRONTEND_DIR / full_path).resolve()
    frontend_root = FRONTEND_DIR.resolve()
    if requested.is_file() and requested.is_relative_to(frontend_root):
        return FileResponse(str(requested))

    index = FRONTEND_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return JSONResponse(
        content={"message": "Frontend not built. Run: cd frontend && npm run build"},
        status_code=503,
    )


if __name__ == "__main__":
    import uvicorn
    server_config = get_server_config()
    uvicorn.run(app, host="0.0.0.0", port=server_config["port"])
