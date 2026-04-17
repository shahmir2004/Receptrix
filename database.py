"""
Enhanced Database setup and operations for AI Voice Receptionist.
Now backed by Supabase PostgreSQL instead of SQLite.

Uses the service-role key -> all calls bypass RLS.
Phase D: All tenant-scoped functions accept optional business_id.
When provided, queries are filtered/inserted with business_id.
When None, backward-compatible single-tenant behavior (Phase C).
"""
from datetime import datetime, timedelta
from typing import List, Optional
from models import (
    Booking, Caller, CallerCreate, CallLog, CallLogCreate,
    Appointment, AppointmentCreate, AppointmentUpdate,
    CallStatus, AppointmentStatus
)
from supabase_client import get_supabase
from logging_config import get_logger

logger = get_logger(__name__)


def init_database():
    """
    No-op in Phase C+. Schema created via Supabase migrations.
    Kept for backward compatibility with main.py startup.
    """
    pass


# ============ Caller Operations ============

def get_or_create_caller(
    phone_number: str,
    name: Optional[str] = None,
    business_id: Optional[str] = None
) -> Caller:
    """Get existing caller or create new one, scoped to business_id."""
    sb = get_supabase()

    # Try to find existing caller by phone (+ business scope if provided)
    query = sb.table("callers").select("*").eq("phone_number", phone_number)
    if business_id:
        query = query.eq("business_id", business_id)
    result = query.execute()

    if result.data:
        row = result.data[0]
        # Increment total_calls
        sb.table("callers").update({
            "total_calls": row["total_calls"] + 1,
            "updated_at": datetime.now().isoformat()
        }).eq("id", row["id"]).execute()

        return Caller(
            id=row["id"],
            phone_number=row["phone_number"],
            name=row["name"],
            email=row["email"],
            notes=row["notes"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.now(),
            total_calls=row["total_calls"] + 1,
            total_appointments=row["total_appointments"]
        )
    else:
        # Create new caller
        now = datetime.now().isoformat()
        new_caller = {
            "phone_number": phone_number,
            "name": name,
            "created_at": now,
            "updated_at": now,
            "total_calls": 1,
            "total_appointments": 0
        }
        if business_id:
            new_caller["business_id"] = business_id
        result = sb.table("callers").insert(new_caller).execute()
        row = result.data[0]

        return Caller(
            id=row["id"],
            phone_number=row["phone_number"],
            name=row["name"],
            email=row.get("email"),
            notes=row.get("notes"),
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            total_calls=row["total_calls"]
        )


def update_caller_name(
    phone_number: str,
    name: str,
    business_id: Optional[str] = None
) -> Optional[Caller]:
    """Update caller's name."""
    sb = get_supabase()

    query = sb.table("callers").update({
        "name": name,
        "updated_at": datetime.now().isoformat()
    }).eq("phone_number", phone_number)
    if business_id:
        query = query.eq("business_id", business_id)
    query.execute()

    q2 = sb.table("callers").select("*").eq("phone_number", phone_number)
    if business_id:
        q2 = q2.eq("business_id", business_id)
    result = q2.execute()

    if result.data:
        row = result.data[0]
        return Caller(
            id=row["id"],
            phone_number=row["phone_number"],
            name=row["name"],
            email=row["email"],
            notes=row["notes"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            total_calls=row["total_calls"],
            total_appointments=row["total_appointments"]
        )
    return None


def get_caller_by_phone(
    phone_number: str,
    business_id: Optional[str] = None
) -> Optional[Caller]:
    """Get caller by phone number."""
    sb = get_supabase()

    query = sb.table("callers").select("*").eq("phone_number", phone_number)
    if business_id:
        query = query.eq("business_id", business_id)
    result = query.execute()

    if result.data:
        row = result.data[0]
        return Caller(
            id=row["id"],
            phone_number=row["phone_number"],
            name=row["name"],
            email=row["email"],
            notes=row["notes"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            total_calls=row["total_calls"],
            total_appointments=row["total_appointments"]
        )
    return None


# ============ Call Log Operations ============

def create_call_log(
    call_sid: str,
    caller_phone: str,
    caller_id: Optional[int] = None,
    business_id: Optional[str] = None
) -> int:
    """Create a new call log entry."""
    sb = get_supabase()

    new_log = {
        "call_sid": call_sid,
        "caller_id": caller_id,
        "caller_phone": caller_phone,
        "call_status": CallStatus.INCOMING.value,
        "started_at": datetime.now().isoformat()
    }
    if business_id:
        new_log["business_id"] = business_id
    result = sb.table("call_logs").insert(new_log).execute()

    return result.data[0]["id"]


def update_call_log(call_sid: str, **kwargs) -> None:
    """Update call log with provided fields."""
    sb = get_supabase()

    updates = {}
    for key, value in kwargs.items():
        if value is not None:
            if hasattr(value, 'value'):  # Enum
                updates[key] = value.value
            elif isinstance(value, datetime):
                updates[key] = value.isoformat()
            else:
                updates[key] = value

    if updates:
        sb.table("call_logs").update(updates).eq("call_sid", call_sid).execute()


def get_call_logs(
    limit: int = 50,
    business_id: Optional[str] = None
) -> List[CallLog]:
    """Get recent call logs."""
    sb = get_supabase()

    query = sb.table("call_logs").select("*").order("started_at", desc=True).limit(limit)
    if business_id:
        query = query.eq("business_id", business_id)
    result = query.execute()

    logs = []
    for row in result.data:
        logs.append(CallLog(
            id=row["id"],
            call_sid=row["call_sid"],
            caller_id=row["caller_id"],
            caller_phone=row["caller_phone"],
            call_status=CallStatus(row["call_status"]),
            started_at=datetime.fromisoformat(row["started_at"]),
            ended_at=datetime.fromisoformat(row["ended_at"]) if row["ended_at"] else None,
            duration_seconds=row["duration_seconds"],
            transcript=row["transcript"],
            summary=row["summary"],
            appointment_created=bool(row["appointment_created"]),
            appointment_id=row["appointment_id"]
        ))

    return logs


# ============ Appointment Operations ============

def create_appointment(
    data: AppointmentCreate,
    caller_id: Optional[int] = None,
    duration: int = 30,
    business_id: Optional[str] = None
) -> int:
    """Create a new appointment."""
    sb = get_supabase()

    now = datetime.now().isoformat()
    new_apt = {
        "caller_id": caller_id,
        "caller_name": data.caller_name,
        "caller_phone": data.caller_phone,
        "service_name": data.service_name,
        "appointment_date": data.appointment_date,
        "appointment_time": data.appointment_time,
        "duration_minutes": duration,
        "status": AppointmentStatus.SCHEDULED.value,
        "notes": data.notes,
        "created_at": now
    }
    if business_id:
        new_apt["business_id"] = business_id

    result = sb.table("appointments").insert(new_apt).execute()
    apt_id = result.data[0]["id"]

    # Update caller's appointment count
    if caller_id:
        sb.table("callers").update({
            "total_appointments": sb.table("callers").select("total_appointments").eq("id", caller_id).execute().data[0]["total_appointments"] + 1,
            "updated_at": now
        }).eq("id", caller_id).execute()

    return apt_id


def get_appointments_for_date(
    date: str,
    business_id: Optional[str] = None
) -> List[Appointment]:
    """Get all appointments for a specific date."""
    sb = get_supabase()

    query = sb.table("appointments").select("*").eq(
        "appointment_date", date
    ).neq("status", "cancelled").order("appointment_time")
    if business_id:
        query = query.eq("business_id", business_id)
    result = query.execute()

    appointments = []
    for row in result.data:
        appointments.append(Appointment(
            id=row["id"],
            caller_id=row["caller_id"],
            caller_name=row["caller_name"],
            caller_phone=row["caller_phone"],
            service_name=row["service_name"],
            appointment_date=row["appointment_date"],
            appointment_time=row["appointment_time"],
            duration_minutes=row["duration_minutes"],
            status=AppointmentStatus(row["status"]),
            notes=row["notes"],
            created_at=datetime.fromisoformat(row["created_at"]),
            reminder_sent=bool(row["reminder_sent"])
        ))

    return appointments


def check_time_slot_available(
    date: str,
    time: str,
    duration: int = 30,
    business_id: Optional[str] = None
) -> bool:
    """Check if a time slot is available."""
    appointments = get_appointments_for_date(date, business_id=business_id)

    # Parse requested time
    requested_start = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
    requested_end = requested_start + timedelta(minutes=duration)

    for apt in appointments:
        apt_start = datetime.strptime(f"{apt.appointment_date} {apt.appointment_time}", "%Y-%m-%d %H:%M")
        apt_end = apt_start + timedelta(minutes=apt.duration_minutes)

        # Check for overlap
        if not (requested_end <= apt_start or requested_start >= apt_end):
            return False

    return True


def get_available_slots(
    date: str,
    working_hours: str,
    service_duration: int = 30,
    business_id: Optional[str] = None
) -> List[str]:
    """Get available time slots for a date."""
    available_slots = []

    # Parse working hours (e.g., "9:00 AM - 6:00 PM")
    if working_hours.lower() == "closed":
        return []

    try:
        parts = working_hours.split(" - ")
        start_str = parts[0].strip()
        end_str = parts[1].strip()

        # Parse times
        start_time = datetime.strptime(start_str, "%I:%M %p")
        end_time = datetime.strptime(end_str, "%I:%M %p")

        # Generate slots every 30 minutes
        current = start_time
        while current + timedelta(minutes=service_duration) <= end_time:
            time_str = current.strftime("%H:%M")
            if check_time_slot_available(date, time_str, service_duration, business_id=business_id):
                available_slots.append(time_str)
            current += timedelta(minutes=30)
    except Exception as e:
        logger.error("Error parsing working hours: %s", e)

    return available_slots


def get_all_appointments(
    limit: int = 100,
    business_id: Optional[str] = None
) -> List[Appointment]:
    """Get all appointments."""
    sb = get_supabase()

    query = sb.table("appointments").select("*").order(
        "appointment_date", desc=True
    ).order("appointment_time", desc=True).limit(limit)
    if business_id:
        query = query.eq("business_id", business_id)
    result = query.execute()

    appointments = []
    for row in result.data:
        appointments.append(Appointment(
            id=row["id"],
            caller_id=row["caller_id"],
            caller_name=row["caller_name"],
            caller_phone=row["caller_phone"],
            service_name=row["service_name"],
            appointment_date=row["appointment_date"],
            appointment_time=row["appointment_time"],
            duration_minutes=row["duration_minutes"],
            status=AppointmentStatus(row["status"]),
            notes=row["notes"],
            created_at=datetime.fromisoformat(row["created_at"]),
            reminder_sent=bool(row["reminder_sent"])
        ))

    return appointments


def update_appointment_status(
    appointment_id: int,
    status: AppointmentStatus,
    business_id: Optional[str] = None,
) -> None:
    """Update appointment status."""
    sb = get_supabase()

    query = sb.table("appointments").update({
        "status": status.value
    }).eq("id", appointment_id)
    if business_id:
        query = query.eq("business_id", business_id)

    result = query.execute()
    if not result.data:
        raise ValueError("Appointment not found")


def get_caller_appointments(
    phone_number: str,
    business_id: Optional[str] = None
) -> List[Appointment]:
    """Get all appointments for a caller."""
    sb = get_supabase()

    query = sb.table("appointments").select("*").eq(
        "caller_phone", phone_number
    ).order("appointment_date", desc=True).order("appointment_time", desc=True)
    if business_id:
        query = query.eq("business_id", business_id)
    result = query.execute()

    appointments = []
    for row in result.data:
        appointments.append(Appointment(
            id=row["id"],
            caller_id=row["caller_id"],
            caller_name=row["caller_name"],
            caller_phone=row["caller_phone"],
            service_name=row["service_name"],
            appointment_date=row["appointment_date"],
            appointment_time=row["appointment_time"],
            duration_minutes=row["duration_minutes"],
            status=AppointmentStatus(row["status"]),
            notes=row["notes"],
            created_at=datetime.fromisoformat(row["created_at"]),
            reminder_sent=bool(row["reminder_sent"])
        ))

    return appointments


# ============ Legacy Booking Operations (backward compatibility) ============

def create_booking(name: str, service: str, date: str, time: str) -> int:
    """Create a new booking in the database (legacy)."""
    sb = get_supabase()

    timestamp = datetime.now().isoformat()
    new_booking = {
        "name": name,
        "service": service,
        "date": date,
        "time": time,
        "timestamp": timestamp
    }

    result = sb.table("bookings").insert(new_booking).execute()
    return result.data[0]["id"]


def get_all_bookings() -> List[Booking]:
    """Retrieve all bookings from the database (legacy)."""
    sb = get_supabase()

    result = sb.table("bookings").select("id, name, service, date, time, timestamp").order("timestamp", desc=True).execute()

    bookings = []
    for row in result.data:
        bookings.append(Booking(
            id=row["id"],
            name=row["name"],
            service=row["service"],
            date=row["date"],
            time=row["time"],
            timestamp=datetime.fromisoformat(row["timestamp"])
        ))

    return bookings


def get_booking_by_id(booking_id: int) -> Optional[Booking]:
    """Retrieve a booking by ID (legacy)."""
    sb = get_supabase()

    result = sb.table("bookings").select("id, name, service, date, time, timestamp").eq("id", booking_id).execute()

    if result.data:
        row = result.data[0]
        return Booking(
            id=row["id"],
            name=row["name"],
            service=row["service"],
            date=row["date"],
            time=row["time"],
            timestamp=datetime.fromisoformat(row["timestamp"])
        )

    return None


# ============ Conversation State Operations ============

def save_conversation_state(call_sid: str, state_data: dict) -> None:
    """Save or update conversation state."""
    sb = get_supabase()

    now = datetime.now().isoformat()
    messages_json = state_data.get("messages", [])
    extracted_info_json = state_data.get("extracted_info", {})

    record = {
        "call_sid": call_sid,
        "caller_phone": state_data.get("caller_phone", ""),
        "state": state_data.get("state", "greeting"),
        "caller_name": state_data.get("caller_name"),
        "requested_service": state_data.get("requested_service"),
        "requested_date": state_data.get("requested_date"),
        "requested_time": state_data.get("requested_time"),
        "messages": messages_json,
        "extracted_info": extracted_info_json,
        "updated_at": now
    }

    # Upsert: if exists, update; else insert
    result = sb.table("conversation_states").select("call_sid").eq("call_sid", call_sid).execute()
    if result.data:
        sb.table("conversation_states").update(record).eq("call_sid", call_sid).execute()
    else:
        record["created_at"] = now
        sb.table("conversation_states").insert(record).execute()


def get_conversation_state(call_sid: str) -> Optional[dict]:
    """Get conversation state for a call."""
    sb = get_supabase()

    result = sb.table("conversation_states").select("*").eq("call_sid", call_sid).execute()

    if result.data:
        row = result.data[0]
        return {
            "call_sid": row["call_sid"],
            "caller_phone": row["caller_phone"],
            "state": row["state"],
            "caller_name": row["caller_name"],
            "requested_service": row["requested_service"],
            "requested_date": row["requested_date"],
            "requested_time": row["requested_time"],
            "messages": row["messages"] if isinstance(row["messages"], list) else [],
            "extracted_info": row["extracted_info"] if isinstance(row["extracted_info"], dict) else {}
        }
    return None


def delete_conversation_state(call_sid: str) -> None:
    """Delete conversation state after call ends."""
    sb = get_supabase()

    sb.table("conversation_states").delete().eq("call_sid", call_sid).execute()
