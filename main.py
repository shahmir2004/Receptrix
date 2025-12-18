"""
FastAPI main application for the AI receptionist system.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List
import os

from models import (
    ChatRequest, 
    ChatResponse, 
    BookingRequest, 
    BookingResponse,
    Booking
)
from receptionist import ReceptionistAI
from database import init_database, create_booking, get_all_bookings
from config import load_config


# Initialize FastAPI app
app = FastAPI(title="AI Receptionist API", version="1.0.0")

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

# Initialize receptionist AI
receptionist = ReceptionistAI()


@app.get("/")
async def root():
    """Serve the frontend HTML file."""
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    return {"message": "AI Receptionist API", "status": "running"}


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


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Handle chat messages from users.
    
    Args:
        request: Chat request with message and optional conversation history
        
    Returns:
        Chat response with message and detected intent
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


@app.get("/services")
async def get_services():
    """
    Get list of available services.
    
    Returns:
        List of services with names, prices, and durations
    """
    try:
        config = receptionist.config
        return {
            "services": [
                {
                    "name": service.name,
                    "price": service.price,
                    "duration": service.duration
                }
                for service in config.services
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving services: {str(e)}")


@app.post("/book", response_model=BookingResponse)
async def book_appointment(request: BookingRequest):
    """
    Create a new booking.
    
    Args:
        request: Booking request with name, service, date, and time
        
    Returns:
        Booking response with success status and message
    """
    try:
        # Validate service exists
        config = receptionist.config
        service_names = [s.name for s in config.services]
        if request.service not in service_names:
            return BookingResponse(
                success=False,
                message=f"Service '{request.service}' not found. Available services: {', '.join(service_names)}"
            )
        
        # Create booking
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


@app.get("/bookings", response_model=List[Booking])
async def get_bookings():
    """
    Get all bookings (for admin/demo purposes).
    
    Returns:
        List of all bookings
    """
    try:
        bookings = get_all_bookings()
        return bookings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving bookings: {str(e)}")


@app.get("/config")
async def get_config():
    """
    Get business configuration.
    
    Returns:
        Business configuration data
    """
    try:
        config = receptionist.config
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
            "contact_info": config.contact_info.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving config: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

