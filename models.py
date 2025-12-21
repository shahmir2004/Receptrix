"""
Enhanced Data models for the AI Voice Receptionist system.
Includes models for appointments, callers, call logs, and conversation state.
"""
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


# ============ Enums ============

class CallStatus(str, Enum):
    """Status of a phone call."""
    INCOMING = "incoming"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    MISSED = "missed"
    FAILED = "failed"


class AppointmentStatus(str, Enum):
    """Status of an appointment."""
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"


class ConversationState(str, Enum):
    """State of the conversation flow."""
    GREETING = "greeting"
    GATHERING_INFO = "gathering_info"
    CHECKING_AVAILABILITY = "checking_availability"
    CONFIRMING_BOOKING = "confirming_booking"
    PROVIDING_INFO = "providing_info"
    FAREWELL = "farewell"


# ============ Service Models ============

class Service(BaseModel):
    """Service model from config."""
    name: str
    price: float
    duration: int  # in minutes
    description: Optional[str] = ""


class ContactInfo(BaseModel):
    """Contact information model."""
    phone: str
    email: str
    address: str


class WorkingHours(BaseModel):
    """Working hours model."""
    monday: str
    tuesday: str
    wednesday: str
    thursday: str
    friday: str
    saturday: str
    sunday: str


class BusinessConfig(BaseModel):
    """Business configuration model."""
    business_name: str
    working_hours: WorkingHours
    services: List[Service]
    contact_info: ContactInfo
    timezone: str = "Asia/Karachi"
    greeting_message: Optional[str] = None
    

# ============ Caller Models ============

class Caller(BaseModel):
    """Caller/Customer information."""
    id: Optional[int] = None
    phone_number: str
    name: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    total_calls: int = 0
    total_appointments: int = 0


class CallerCreate(BaseModel):
    """Model for creating a new caller."""
    phone_number: str
    name: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


# ============ Call Log Models ============

class CallLog(BaseModel):
    """Call log entry."""
    id: Optional[int] = None
    call_sid: str  # Twilio Call SID
    caller_id: Optional[int] = None
    caller_phone: str
    call_status: CallStatus
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    appointment_created: bool = False
    appointment_id: Optional[int] = None


class CallLogCreate(BaseModel):
    """Model for creating a call log."""
    call_sid: str
    caller_phone: str
    call_status: CallStatus = CallStatus.INCOMING


# ============ Appointment Models ============

class Appointment(BaseModel):
    """Appointment model."""
    id: Optional[int] = None
    caller_id: Optional[int] = None
    caller_name: str
    caller_phone: str
    service_name: str
    appointment_date: str  # Format: YYYY-MM-DD
    appointment_time: str  # Format: HH:MM
    duration_minutes: int
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    reminder_sent: bool = False


class AppointmentCreate(BaseModel):
    """Model for creating an appointment."""
    caller_name: str
    caller_phone: str
    service_name: str
    appointment_date: str
    appointment_time: str
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    """Model for updating an appointment."""
    caller_name: Optional[str] = None
    service_name: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None


# ============ Conversation Models ============

class ConversationContext(BaseModel):
    """Context for ongoing conversation during a call."""
    call_sid: str
    caller_phone: str
    state: ConversationState = ConversationState.GREETING
    caller_name: Optional[str] = None
    requested_service: Optional[str] = None
    requested_date: Optional[str] = None
    requested_time: Optional[str] = None
    messages: List[Dict[str, str]] = []  # History of messages
    intent_history: List[str] = []
    extracted_info: Dict[str, Any] = {}
    

class VoiceResponse(BaseModel):
    """Response for voice interaction."""
    text: str
    should_end_call: bool = False
    next_state: Optional[ConversationState] = None
    appointment_data: Optional[AppointmentCreate] = None


# ============ Chat Models (Legacy Support) ============

class ChatMessage(BaseModel):
    """Chat message model."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    message: str
    conversation_history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    message: str
    intent: str


# ============ Booking Models (Legacy Support) ============

class BookingRequest(BaseModel):
    """Request model for booking endpoint."""
    name: str
    service: str
    date: str  # Format: YYYY-MM-DD
    time: str  # Format: HH:MM
    phone: Optional[str] = None


class BookingResponse(BaseModel):
    """Response model for booking endpoint."""
    success: bool
    message: str
    booking_id: Optional[int] = None


class Booking(BaseModel):
    """Booking model (legacy compatibility)."""
    id: int
    name: str
    service: str
    date: str
    time: str
    timestamp: datetime


# ============ Time Slot Models ============

class TimeSlot(BaseModel):
    """Available time slot."""
    date: str
    time: str
    available: bool = True
    service_name: Optional[str] = None


class AvailabilityRequest(BaseModel):
    """Request for checking availability."""
    date: str
    service_name: Optional[str] = None


class AvailabilityResponse(BaseModel):
    """Response with available time slots."""
    date: str
    slots: List[TimeSlot]
    
    
# ============ Twilio Webhook Models ============

class TwilioVoiceWebhook(BaseModel):
    """Twilio voice webhook data."""
    CallSid: str
    From: str
    To: str
    CallStatus: str
    Direction: Optional[str] = None
    CallerCity: Optional[str] = None
    CallerCountry: Optional[str] = None


class TwilioSpeechResult(BaseModel):
    """Twilio speech recognition result."""
    CallSid: str
    SpeechResult: Optional[str] = None
    Confidence: Optional[float] = None


