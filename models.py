"""
Data models for the receptionist system.
"""
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel


class Service(BaseModel):
    """Service model from config."""
    name: str
    price: float
    duration: int


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


class BookingRequest(BaseModel):
    """Request model for booking endpoint."""
    name: str
    service: str
    date: str  # Format: YYYY-MM-DD
    time: str  # Format: HH:MM


class BookingResponse(BaseModel):
    """Response model for booking endpoint."""
    success: bool
    message: str
    booking_id: Optional[int] = None


class Booking(BaseModel):
    """Booking model."""
    id: int
    name: str
    service: str
    date: str
    time: str
    timestamp: datetime


