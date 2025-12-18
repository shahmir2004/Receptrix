# AI Receptionist MVP

A generic, production-style AI-powered virtual receptionist system built with Python FastAPI, Ollama (Llama 3), SQLite, and vanilla JavaScript.

## Overview

This system acts as a virtual receptionist that can:
- Handle customer conversations via chat
- Answer business FAQs
- Provide service information and pricing
- Share working hours and contact information
- Process appointment bookings
- Store bookings in a database

## Tech Stack

- **Backend**: Python 3.8+ with FastAPI
- **AI**: Ollama with Llama 3 model
- **Database**: SQLite
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Configuration**: JSON file

## Prerequisites

1. **Python 3.8 or higher**
   ```bash
   python --version
   ```

2. **Ollama installed and running**
   - Download from: https://ollama.ai/
   - Install Ollama on your system
   - Pull the Llama 3 model:
     ```bash
     ollama pull llama3
     ```
   - Verify Ollama is running:
     ```bash
     ollama list
     ```

## Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd Receptrix
   ```

2. **Create a virtual environment (recommended)**
   ```bash
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

Edit `business_config.json` to customize your business details:

```json
{
  "business_name": "Your Business Name",
  "working_hours": {
    "monday": "9:00 AM - 6:00 PM",
    ...
  },
  "services": [
    {
      "name": "Service Name",
      "price": 100,
      "duration": 60
    }
  ],
  "contact_info": {
    "phone": "+1 (555) 123-4567",
    "email": "info@business.com",
    "address": "123 Main St, City, State"
  }
}
```

## Running the Application

1. **Start the FastAPI server**
   ```bash
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Open your browser**
   Navigate to: `http://localhost:8000`

The chat interface should load automatically.

## API Endpoints

- `GET /` - Serves the frontend HTML
- `POST /chat` - Send a chat message and get AI response
- `GET /services` - Get list of available services
- `POST /book` - Create a new booking
- `GET /bookings` - Get all bookings (admin/demo)
- `GET /config` - Get business configuration

## Project Structure

```
Receptrix/
├── main.py                 # FastAPI application
├── models.py               # Pydantic data models
├── config.py               # Configuration loader
├── database.py             # SQLite database operations
├── receptionist.py         # AI receptionist logic
├── business_config.json    # Business configuration
├── requirements.txt        # Python dependencies
├── index.html             # Frontend HTML
├── style.css              # Frontend styles
├── script.js              # Frontend JavaScript
├── receptionist.db        # SQLite database (created automatically)
└── README.md              # This file
```

## How It Works

1. **Intent Detection**: The system uses keyword-based intent detection to categorize user messages (greeting, service inquiry, pricing, hours, booking, etc.)

2. **Response Generation**: 
   - For structured queries (services, pricing, hours), rule-based responses are used for consistency
   - For conversational queries (greetings, bookings, general questions), the Ollama LLM generates responses

3. **Booking Flow**: When a user expresses interest in booking, the AI guides them through providing necessary information (name, service, date, time), which is then stored in SQLite

4. **Configuration-Driven**: All business details come from `business_config.json`, making it easy to customize without code changes

## Customization

### Changing the AI Model

Edit `receptionist.py`, line 26:
```python
def __init__(self, model_name: str = "llama3"):
    # Change "llama3" to any Ollama model you have installed
```

### Adding New Intents

1. Add a new constant to `IntentType` class in `receptionist.py`
2. Add detection logic in `detect_intent()` method
3. Add handling logic in `generate_response()` method

### Database Schema

The bookings table structure:
- `id` (INTEGER, PRIMARY KEY)
- `name` (TEXT)
- `service` (TEXT)
- `date` (TEXT, YYYY-MM-DD)
- `time` (TEXT, HH:MM)
- `timestamp` (TEXT, ISO format)

## Troubleshooting

**Ollama connection errors:**
- Ensure Ollama is running: `ollama list`
- Verify the model is installed: `ollama pull llama3`

**Port already in use:**
- Change the port in `main.py` or use: `uvicorn main:app --port 8001`

**CORS errors:**
- The current setup allows all origins. In production, update `allow_origins` in `main.py`

## Future Enhancements

This MVP is designed to be extended for salon-specific features:
- Multiple business locations
- Service categories and sub-services
- Booking conflict detection
- Email/SMS notifications
- Customer authentication
- Appointment management dashboard
- Payment integration

## License

This is a free, open-source MVP. Customize as needed for your use case.

## Support

For issues or questions, check that:
1. Python 3.8+ is installed
2. All dependencies are installed (`pip install -r requirements.txt`)
3. Ollama is running and llama3 model is pulled
4. The configuration file is valid JSON
5. Port 8000 is available


