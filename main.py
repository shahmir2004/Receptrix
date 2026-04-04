"""
FastAPI main application for the AI Voice Receptionist system.
Handles both web chat and Twilio/SignalWire voice calls.

Phase E: Business settings CRUD, tenant-scoped frontend, cache invalidation.
Voice endpoints remain unauthenticated (webhook callbacks from provider).
"""
from fastapi import FastAPI, HTTPException, Form, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response, HTMLResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import List, Optional, Tuple
import os
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
    AppointmentStatus
)
from config import load_config, get_config, get_server_config, get_voice_provider
from twilio_service import get_twilio_service
from signalwire_service import get_signalwire_service
from auth import (
    require_auth, require_business_access, require_business_admin,
    sign_up, sign_in, create_business_for_user, add_business_member,
    get_current_user_id
)
from tenant import get_business_config
from logging_config import configure_logging, get_logger

logger = get_logger(__name__)


def get_voice_service():
    """Get the appropriate voice service based on configuration."""
    provider = get_voice_provider()
    if provider == "signalwire":
        return get_signalwire_service()
    else:
        return get_twilio_service()


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
    allow_headers=["Authorization", "Content-Type", "X-Business-Id"],
)


# Configure structured logging before anything else
configure_logging()

# Load configuration (still used as fallback for single-tenant mode)
load_config()


# ============ Static Files & Frontend ============

@app.get("/")
async def root():
    """Serve the frontend HTML file."""
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    return {"message": "AI Voice Receptionist API", "status": "running"}


@app.get("/style.css")
async def get_css():
    """Serve CSS file."""
    if os.path.exists("style.css"):
        return FileResponse("style.css", media_type="text/css")
    raise HTTPException(status_code=404, detail="CSS file not found")


@app.get("/script.js")
async def get_js():
    """Serve JavaScript file."""
    if os.path.exists("script.js"):
        return FileResponse("script.js", media_type="application/javascript")
    raise HTTPException(status_code=404, detail="JavaScript file not found")


# ============ Auth Endpoints ============

class SignUpRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""

class SignInRequest(BaseModel):
    email: str
    password: str

class CreateBusinessRequest(BaseModel):
    business_name: str
    phone: str = ""
    email: str = ""
    address: str = ""
    timezone: str = "Asia/Karachi"
    greeting_message: str = ""
    working_hours: Optional[dict] = None

class UpdateBusinessRequest(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    greeting_message: Optional[str] = None
    working_hours: Optional[dict] = None

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


@app.post("/auth/signup")
@limiter.limit("10/minute")
async def auth_signup(request: Request, req: SignUpRequest):
    """Register a new user via Supabase Auth."""
    try:
        result = sign_up(req.email, req.password, req.full_name)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/signin")
@limiter.limit("20/minute")
async def auth_signin(request: Request, req: SignInRequest):
    """Sign in and receive access + refresh tokens, plus business memberships."""
    try:
        result = sign_in(req.email, req.password)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.get("/auth/me")
async def auth_me(user_id: str = Depends(require_auth)):
    """Get current user profile and business memberships."""
    from supabase_client import get_supabase
    sb = get_supabase()

    profile = sb.table("profiles").select("*").eq("id", user_id).execute()
    memberships = sb.table("business_memberships").select(
        "business_id, role, businesses(id, name)"
    ).eq("user_id", user_id).execute()

    return {
        "user_id": user_id,
        "profile": profile.data[0] if profile.data else None,
        "businesses": [
            {
                "business_id": m["business_id"],
                "role": m["role"],
                "business_name": m["businesses"]["name"] if m.get("businesses") else None
            }
            for m in memberships.data
        ] if memberships.data else []
    }


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
            working_hours=req.working_hours
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

    return biz.data[0]


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

    return {"services": result.data}


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


# ============ Voice/Twilio/SignalWire Endpoints ============
# These are webhook callbacks — NOT JWT-authenticated.
# Tenant resolution happens via the To phone number.

@app.post("/voice/incoming")
async def voice_incoming(
    CallSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(None),
    CallStatus: str = Form(None)
):
    """
    Handle incoming voice calls from Twilio or SignalWire.
    This is the webhook endpoint configured in your voice provider.
    """
    try:
        voice_service = get_voice_service()
        twiml = voice_service.handle_incoming_call(CallSid, From, to_number=To)

        return Response(content=twiml, media_type="application/xml")
    except Exception as e:
        logger.error("Voice incoming error: %s", e, exc_info=True)
        # Return a basic TwiML response on error
        error_twiml = """
        <Response>
            <Say voice="Polly.Joanna">We're sorry, we're experiencing technical difficulties. Please try again later.</Say>
            <Hangup/>
        </Response>
        """
        return Response(content=error_twiml, media_type="application/xml")


@app.post("/voice/respond")
async def voice_respond(
    CallSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(None),
    SpeechResult: str = Form(None),
    Confidence: float = Form(None)
):
    """
    Handle speech input from ongoing call.
    Called by Twilio/SignalWire when caller speaks.
    """
    try:
        logger.info("Voice respond - CallSid: %s, From: %s, Speech: %s", CallSid, From, SpeechResult)

        if not SpeechResult:
            # No speech detected, handle as no input
            voice_service = get_voice_service()
            twiml = voice_service.handle_no_input(CallSid)
            return Response(content=twiml, media_type="application/xml")

        voice_service = get_voice_service()
        twiml = voice_service.handle_speech_input(CallSid, From, SpeechResult, to_number=To)

        return Response(content=twiml, media_type="application/xml")
    except Exception as e:
        logger.error("Voice respond error: %s", e, exc_info=True)
        error_twiml = """
        <Response>
            <Say voice="Polly.Joanna">I'm sorry, could you please repeat that?</Say>
            <Gather input="speech" action="/voice/respond" method="POST" language="en-US" speechTimeout="auto"/>
        </Response>
        """
        return Response(content=error_twiml, media_type="application/xml")


@app.post("/voice/no-input")
async def voice_no_input(
    CallSid: str = Form(...),
    From: str = Form(...)
):
    """Handle when caller doesn't respond."""
    try:
        voice_service = get_voice_service()
        twiml = voice_service.handle_no_input(CallSid, From)
        return Response(content=twiml, media_type="application/xml")
    except Exception as e:
        logger.error("No input error: %s", e)
        twiml = """
        <Response>
            <Say voice="Polly.Joanna">Goodbye!</Say>
            <Hangup/>
        </Response>
        """
        return Response(content=twiml, media_type="application/xml")


@app.post("/voice/status")
async def voice_status(
    CallSid: str = Form(...),
    CallStatus: str = Form(...)
):
    """Handle call status updates."""
    try:
        voice_service = get_voice_service()
        voice_service.handle_call_status(CallSid, CallStatus)
        return {"status": "ok"}
    except Exception as e:
        logger.error("Status webhook error: %s", e)
        return {"status": "error", "message": str(e)}


@app.get("/debug/ai")
async def debug_ai():
    """Debug endpoint to test AI provider connectivity."""
    try:
        from voice_handler import get_voice_handler
        handler = get_voice_handler()

        # Test basic AI call
        test_response = handler.provider.chat(
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello in one word."}
            ],
            temperature=0.5,
            max_tokens=10
        )

        return JSONResponse({
            "status": "ok",
            "provider": type(handler.provider).__name__,
            "test_response": test_response,
            "groq_key_set": bool(os.getenv("GROQ_API_KEY")),
            "ai_provider_env": os.getenv("AI_PROVIDER", "not set")
        })
    except Exception as e:
        import traceback
        return JSONResponse({
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc(),
            "groq_key_set": bool(os.getenv("GROQ_API_KEY")),
            "ai_provider_env": os.getenv("AI_PROVIDER", "not set")
        }, status_code=500)


@app.get("/debug/voice")
async def debug_voice():
    """Debug the full voice handler flow."""
    try:
        from voice_handler import get_voice_handler
        handler = get_voice_handler()

        # Test the full generate_response
        response = handler.generate_response(
            caller_input="Hello, what services do you offer?",
            call_sid="DEBUG_TEST_123",
            caller_phone="+1234567890"
        )

        return JSONResponse({
            "status": "ok",
            "response_text": response.text,
            "should_end_call": response.should_end_call
        })
    except Exception as e:
        import traceback
        return JSONResponse({
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }, status_code=500)


# ============ Chat Endpoints ============

@app.post("/chat", response_model=ChatResponse)
@limiter.limit("60/minute")
async def chat(http_request: Request, request: ChatRequest):
    """
    Handle chat messages from users (web interface).
    If authenticated with X-Business-Id, uses tenant-scoped config.
    Otherwise falls back to default config (backward compat).
    """
    try:
        # Try to extract business context (optional for chat)
        business_id = http_request.headers.get("x-business-id")
        receptionist = ReceptionistAI(business_id=business_id)

        result = receptionist.handle_message(
            message=request.message,
            conversation_history=request.conversation_history
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
async def get_services(request: Request):
    """Get list of available services (tenant-aware)."""
    try:
        business_id = request.headers.get("x-business-id")
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
async def create_new_appointment(data: AppointmentCreate, request: Request):
    """Create a new appointment (tenant-aware)."""
    try:
        business_id = request.headers.get("x-business-id")
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
async def list_appointments(request: Request, date: Optional[str] = None, limit: int = 50):
    """Get appointments, optionally filtered by date (tenant-aware)."""
    try:
        business_id = request.headers.get("x-business-id")
        if date:
            appointments = get_appointments_for_date(date, business_id=business_id)
        else:
            appointments = get_all_appointments(limit, business_id=business_id)

        return {"appointments": [apt.model_dump() for apt in appointments]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/appointments/availability")
async def check_availability(request: Request, date: str, service: Optional[str] = None):
    """Check available time slots for a date (tenant-aware)."""
    try:
        business_id = request.headers.get("x-business-id")
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
async def update_appointment(appointment_id: int, status: str):
    """Update appointment status."""
    try:
        status_enum = AppointmentStatus(status)
        update_appointment_status(appointment_id, status_enum)
        return {"success": True, "message": f"Appointment status updated to {status}"}
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
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
async def get_calls(request: Request, limit: int = 50):
    """Get call logs (tenant-aware)."""
    try:
        business_id = request.headers.get("x-business-id")
        calls = get_call_logs(limit, business_id=business_id)
        return {"calls": [call.model_dump() for call in calls]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Config Endpoints ============

@app.get("/config")
async def get_business_config_endpoint(request: Request):
    """Get business configuration (tenant-aware)."""
    try:
        business_id = request.headers.get("x-business-id")
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
    Enhanced health check: verifies DB connectivity and AI provider env.
    Returns HTTP 503 if any critical dependency is unavailable.
    """
    checks: dict = {}
    overall_ok = True

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
    voice_provider = os.getenv("VOICE_PROVIDER", "signalwire").lower()
    if voice_provider == "twilio":
        voice_ok = bool(os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN"))
    else:
        voice_ok = bool(os.getenv("SIGNALWIRE_PROJECT_ID") and os.getenv("SIGNALWIRE_API_TOKEN"))
    checks["voice_provider"] = voice_provider if voice_ok else f"{voice_provider} (credentials missing)"

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
async def get_stats(request: Request):
    """Get dashboard statistics (tenant-aware)."""
    try:
        business_id = request.headers.get("x-business-id")
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


if __name__ == "__main__":
    import uvicorn
    server_config = get_server_config()
    uvicorn.run(app, host="0.0.0.0", port=server_config["port"])
