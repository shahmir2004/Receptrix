"""
FastAPI main application for the AI Voice Receptionist system.
Handles both web chat and Twilio voice calls.
"""
from fastapi import FastAPI, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response, HTMLResponse, JSONResponse
from typing import List, Optional
import os
from datetime import datetime

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
from config import load_config, get_config, get_server_config
from twilio_service import get_twilio_service


# Initialize FastAPI app
app = FastAPI(
    title="AI Voice Receptionist API",
    description="Autonomous AI receptionist that handles phone calls and appointments",
    version="2.0.0"
)

# CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Initialize database
init_database()

# Load configuration
load_config()

# Initialize receptionist AI (for chat interface)
receptionist = ReceptionistAI()


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


# ============ Voice/Twilio Endpoints ============

@app.post("/voice/incoming")
async def voice_incoming(
    CallSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(None),
    CallStatus: str = Form(None)
):
    """
    Handle incoming voice calls from Twilio.
    This is the webhook endpoint configured in Twilio.
    """
    try:
        twilio_service = get_twilio_service()
        twiml = twilio_service.handle_incoming_call(CallSid, From)
        
        return Response(content=twiml, media_type="application/xml")
    except Exception as e:
        print(f"Voice incoming error: {e}")
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
    SpeechResult: str = Form(None),
    Confidence: float = Form(None)
):
    """
    Handle speech input from ongoing call.
    Called by Twilio when caller speaks.
    """
    try:
        print(f"Voice respond - CallSid: {CallSid}, From: {From}, Speech: {SpeechResult}")
        
        if not SpeechResult:
            # No speech detected, handle as no input
            twilio_service = get_twilio_service()
            twiml = twilio_service.handle_no_input(CallSid, From)
            return Response(content=twiml, media_type="application/xml")
        
        twilio_service = get_twilio_service()
        twiml = twilio_service.handle_speech_input(CallSid, From, SpeechResult)
        
        return Response(content=twiml, media_type="application/xml")
    except Exception as e:
        import traceback
        print(f"Voice respond error: {e}")
        traceback.print_exc()
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
        twilio_service = get_twilio_service()
        twiml = twilio_service.handle_no_input(CallSid, From)
        return Response(content=twiml, media_type="application/xml")
    except Exception as e:
        print(f"No input error: {e}")
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
    """Handle call status updates from Twilio."""
    try:
        twilio_service = get_twilio_service()
        twilio_service.handle_call_status(CallSid, CallStatus)
        return {"status": "ok"}
    except Exception as e:
        print(f"Status webhook error: {e}")
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
async def chat(request: ChatRequest):
    """
    Handle chat messages from users (web interface).
    """
    try:
        result = receptionist.handle_message(
            message=request.message,
            conversation_history=request.conversation_history
        )
        
        return ChatResponse(
            message=result["message"],
            intent=result["intent"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


# ============ Services Endpoints ============

@app.get("/services")
async def get_services():
    """Get list of available services."""
    try:
        config = get_config()
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
async def create_new_appointment(data: AppointmentCreate):
    """Create a new appointment."""
    try:
        config = get_config()
        
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
        if not check_time_slot_available(data.appointment_date, data.appointment_time, service.duration):
            raise HTTPException(
                status_code=400,
                detail="Time slot not available"
            )
        
        # Get or create caller
        caller = get_or_create_caller(data.caller_phone, data.caller_name)
        
        appointment_id = create_appointment(data, caller.id, service.duration)
        
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
async def list_appointments(date: Optional[str] = None, limit: int = 50):
    """Get appointments, optionally filtered by date."""
    try:
        if date:
            appointments = get_appointments_for_date(date)
        else:
            appointments = get_all_appointments(limit)
        
        return {"appointments": [apt.model_dump() for apt in appointments]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/appointments/availability")
async def check_availability(date: str, service: Optional[str] = None):
    """Check available time slots for a date."""
    try:
        config = get_config()
        
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
        
        slots = get_available_slots(date, working_hours, duration)
        
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
async def get_calls(limit: int = 50):
    """Get call logs."""
    try:
        calls = get_call_logs(limit)
        return {"calls": [call.model_dump() for call in calls]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Config Endpoints ============

@app.get("/config")
async def get_business_config():
    """Get business configuration."""
    try:
        config = get_config()
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
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }


# ============ Dashboard Stats ============

@app.get("/stats")
async def get_stats():
    """Get dashboard statistics."""
    try:
        appointments = get_all_appointments(100)
        calls = get_call_logs(100)
        
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

