"""
Enhanced Database setup and operations for AI Voice Receptionist.
Includes tables for callers, call logs, and appointments.
"""
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Tuple
from models import (
    Booking, Caller, CallerCreate, CallLog, CallLogCreate, 
    Appointment, AppointmentCreate, AppointmentUpdate,
    CallStatus, AppointmentStatus
)


DB_PATH = "receptionist.db"


def get_connection():
    """Get database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize the SQLite database with all tables."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Legacy bookings table (for backward compatibility)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            service TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    
    # Callers table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS callers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone_number TEXT UNIQUE NOT NULL,
            name TEXT,
            email TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            total_calls INTEGER DEFAULT 0,
            total_appointments INTEGER DEFAULT 0
        )
    """)
    
    # Call logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS call_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            call_sid TEXT UNIQUE NOT NULL,
            caller_id INTEGER,
            caller_phone TEXT NOT NULL,
            call_status TEXT NOT NULL,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            duration_seconds INTEGER,
            transcript TEXT,
            summary TEXT,
            appointment_created INTEGER DEFAULT 0,
            appointment_id INTEGER,
            FOREIGN KEY (caller_id) REFERENCES callers(id),
            FOREIGN KEY (appointment_id) REFERENCES appointments(id)
        )
    """)
    
    # Appointments table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            caller_id INTEGER,
            caller_name TEXT NOT NULL,
            caller_phone TEXT NOT NULL,
            service_name TEXT NOT NULL,
            appointment_date TEXT NOT NULL,
            appointment_time TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            status TEXT DEFAULT 'scheduled',
            notes TEXT,
            created_at TEXT NOT NULL,
            reminder_sent INTEGER DEFAULT 0,
            FOREIGN KEY (caller_id) REFERENCES callers(id)
        )
    """)
    
    # Conversation state table (for tracking ongoing calls)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversation_states (
            call_sid TEXT PRIMARY KEY,
            caller_phone TEXT NOT NULL,
            state TEXT NOT NULL,
            caller_name TEXT,
            requested_service TEXT,
            requested_date TEXT,
            requested_time TEXT,
            messages TEXT,
            extracted_info TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()


# ============ Caller Operations ============

def get_or_create_caller(phone_number: str, name: Optional[str] = None) -> Caller:
    """Get existing caller or create new one."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM callers WHERE phone_number = ?", (phone_number,))
    row = cursor.fetchone()
    
    if row:
        # Update call count
        cursor.execute(
            "UPDATE callers SET total_calls = total_calls + 1, updated_at = ? WHERE id = ?",
            (datetime.now().isoformat(), row["id"])
        )
        conn.commit()
        
        caller = Caller(
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
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO callers (phone_number, name, created_at, updated_at, total_calls)
            VALUES (?, ?, ?, ?, 1)
        """, (phone_number, name, now, now))
        
        caller = Caller(
            id=cursor.lastrowid,
            phone_number=phone_number,
            name=name,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            total_calls=1
        )
        conn.commit()
    
    conn.close()
    return caller


def update_caller_name(phone_number: str, name: str) -> Optional[Caller]:
    """Update caller's name."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE callers SET name = ?, updated_at = ? WHERE phone_number = ?
    """, (name, datetime.now().isoformat(), phone_number))
    
    conn.commit()
    
    cursor.execute("SELECT * FROM callers WHERE phone_number = ?", (phone_number,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
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


def get_caller_by_phone(phone_number: str) -> Optional[Caller]:
    """Get caller by phone number."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM callers WHERE phone_number = ?", (phone_number,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
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

def create_call_log(call_sid: str, caller_phone: str, caller_id: Optional[int] = None) -> int:
    """Create a new call log entry."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO call_logs (call_sid, caller_id, caller_phone, call_status, started_at)
        VALUES (?, ?, ?, ?, ?)
    """, (call_sid, caller_id, caller_phone, CallStatus.INCOMING.value, datetime.now().isoformat()))
    
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return log_id


def update_call_log(call_sid: str, **kwargs) -> None:
    """Update call log with provided fields."""
    conn = get_connection()
    cursor = conn.cursor()
    
    updates = []
    values = []
    
    for key, value in kwargs.items():
        if value is not None:
            updates.append(f"{key} = ?")
            if isinstance(value, Enum):
                values.append(value.value)
            elif isinstance(value, datetime):
                values.append(value.isoformat())
            else:
                values.append(value)
    
    if updates:
        values.append(call_sid)
        cursor.execute(f"""
            UPDATE call_logs SET {', '.join(updates)} WHERE call_sid = ?
        """, values)
        conn.commit()
    
    conn.close()


def get_call_logs(limit: int = 50) -> List[CallLog]:
    """Get recent call logs."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM call_logs ORDER BY started_at DESC LIMIT ?
    """, (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    
    logs = []
    for row in rows:
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

def create_appointment(data: AppointmentCreate, caller_id: Optional[int] = None, duration: int = 30) -> int:
    """Create a new appointment."""
    conn = get_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    
    cursor.execute("""
        INSERT INTO appointments 
        (caller_id, caller_name, caller_phone, service_name, appointment_date, 
         appointment_time, duration_minutes, status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        caller_id, data.caller_name, data.caller_phone, data.service_name,
        data.appointment_date, data.appointment_time, duration,
        AppointmentStatus.SCHEDULED.value, data.notes, now
    ))
    
    appointment_id = cursor.lastrowid
    
    # Update caller's appointment count
    if caller_id:
        cursor.execute("""
            UPDATE callers SET total_appointments = total_appointments + 1, updated_at = ?
            WHERE id = ?
        """, (now, caller_id))
    
    conn.commit()
    conn.close()
    
    return appointment_id


def get_appointments_for_date(date: str) -> List[Appointment]:
    """Get all appointments for a specific date."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM appointments 
        WHERE appointment_date = ? AND status != 'cancelled'
        ORDER BY appointment_time
    """, (date,))
    
    rows = cursor.fetchall()
    conn.close()
    
    appointments = []
    for row in rows:
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


def check_time_slot_available(date: str, time: str, duration: int = 30) -> bool:
    """Check if a time slot is available."""
    appointments = get_appointments_for_date(date)
    
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


def get_available_slots(date: str, working_hours: str, service_duration: int = 30) -> List[str]:
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
            if check_time_slot_available(date, time_str, service_duration):
                available_slots.append(time_str)
            current += timedelta(minutes=30)
    except Exception as e:
        print(f"Error parsing working hours: {e}")
    
    return available_slots


def get_all_appointments(limit: int = 100) -> List[Appointment]:
    """Get all appointments."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM appointments ORDER BY appointment_date DESC, appointment_time DESC LIMIT ?
    """, (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    
    appointments = []
    for row in rows:
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


def update_appointment_status(appointment_id: int, status: AppointmentStatus) -> None:
    """Update appointment status."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE appointments SET status = ? WHERE id = ?
    """, (status.value, appointment_id))
    
    conn.commit()
    conn.close()


def get_caller_appointments(phone_number: str) -> List[Appointment]:
    """Get all appointments for a caller."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM appointments 
        WHERE caller_phone = ? 
        ORDER BY appointment_date DESC, appointment_time DESC
    """, (phone_number,))
    
    rows = cursor.fetchall()
    conn.close()
    
    appointments = []
    for row in rows:
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
    conn = get_connection()
    cursor = conn.cursor()
    
    timestamp = datetime.now().isoformat()
    
    cursor.execute("""
        INSERT INTO bookings (name, service, date, time, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (name, service, date, time, timestamp))
    
    booking_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return booking_id


def get_all_bookings() -> List[Booking]:
    """Retrieve all bookings from the database (legacy)."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, service, date, time, timestamp
        FROM bookings
        ORDER BY timestamp DESC
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    bookings = []
    for row in rows:
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
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, service, date, time, timestamp
        FROM bookings
        WHERE id = ?
    """, (booking_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
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
    import json
    
    conn = get_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    messages_json = json.dumps(state_data.get("messages", []))
    extracted_info_json = json.dumps(state_data.get("extracted_info", {}))
    
    cursor.execute("""
        INSERT OR REPLACE INTO conversation_states 
        (call_sid, caller_phone, state, caller_name, requested_service, 
         requested_date, requested_time, messages, extracted_info, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(
            (SELECT created_at FROM conversation_states WHERE call_sid = ?), ?
        ), ?)
    """, (
        call_sid, state_data.get("caller_phone", ""), state_data.get("state", "greeting"),
        state_data.get("caller_name"), state_data.get("requested_service"),
        state_data.get("requested_date"), state_data.get("requested_time"),
        messages_json, extracted_info_json, call_sid, now, now
    ))
    
    conn.commit()
    conn.close()


def get_conversation_state(call_sid: str) -> Optional[dict]:
    """Get conversation state for a call."""
    import json
    
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM conversation_states WHERE call_sid = ?", (call_sid,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "call_sid": row["call_sid"],
            "caller_phone": row["caller_phone"],
            "state": row["state"],
            "caller_name": row["caller_name"],
            "requested_service": row["requested_service"],
            "requested_date": row["requested_date"],
            "requested_time": row["requested_time"],
            "messages": json.loads(row["messages"]) if row["messages"] else [],
            "extracted_info": json.loads(row["extracted_info"]) if row["extracted_info"] else {}
        }
    return None


def delete_conversation_state(call_sid: str) -> None:
    """Delete conversation state after call ends."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM conversation_states WHERE call_sid = ?", (call_sid,))
    
    conn.commit()
    conn.close()


