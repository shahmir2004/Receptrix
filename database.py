"""
Database setup and operations for bookings.
"""
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from models import Booking


DB_PATH = "receptionist.db"


def init_database():
    """Initialize the SQLite database with bookings table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
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
    
    conn.commit()
    conn.close()


def create_booking(name: str, service: str, date: str, time: str) -> int:
    """
    Create a new booking in the database.
    
    Args:
        name: Customer name
        service: Service name
        date: Booking date (YYYY-MM-DD)
        time: Booking time (HH:MM)
        
    Returns:
        ID of the created booking
    """
    conn = sqlite3.connect(DB_PATH)
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
    """
    Retrieve all bookings from the database.
    
    Returns:
        List of Booking objects
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
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
    """
    Retrieve a booking by ID.
    
    Args:
        booking_id: ID of the booking
        
    Returns:
        Booking object or None if not found
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
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


