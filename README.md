# 📞 Receptrix - AI Voice Receptionist# AI Receptionist MVP



An autonomous AI-powered receptionist that handles phone calls, schedules appointments, and manages your business communications automatically.A generic, production-style AI-powered virtual receptionist system built with Python FastAPI, Ollama (Llama 3), SQLite, and vanilla JavaScript.



## ✨ Features## Overview



- **🤖 AI Voice Handling**: Natural conversation with callers using OpenAI GPTThis system acts as a virtual receptionist that can:

- **📞 Phone Integration**: Twilio-powered phone call handling with speech-to-text- Handle customer conversations via chat

- **📅 Smart Scheduling**: Automatic appointment booking with conflict detection- Answer business FAQs

- **👤 Caller Recognition**: Remembers returning callers by phone number- Provide service information and pricing

- **📊 Dashboard**: Web interface to manage appointments and view call logs- Share working hours and contact information

- **💬 Chat Interface**: Test the AI receptionist via web chat- Process appointment bookings

- **🇵🇰 Pakistan Optimized**: Configured for PKT timezone and local phone numbers- Store bookings in a database



## 🚀 Quick Start## Tech Stack



### Prerequisites- **Backend**: Python 3.8+ with FastAPI

- **AI**: Ollama with Llama 3 model

- Python 3.9+- **Database**: SQLite

- Twilio Account (for phone calls)- **Frontend**: HTML, CSS, Vanilla JavaScript

- OpenAI API Key (for AI responses)- **Configuration**: JSON file

- ngrok or public server (for Twilio webhooks)

## Prerequisites

### Installation

1. **Python 3.8 or higher**

1. **Clone and navigate to the project:**   ```bash

   ```bash   python --version

   cd Receptrix   ```

   ```

2. **Ollama installed and running**

2. **Create a virtual environment:**   - Download from: https://ollama.ai/

   ```bash   - Install Ollama on your system

   python -m venv venv   - Pull the Llama 3 model:

        ```bash

   # Windows     ollama pull llama3

   venv\Scripts\activate     ```

      - Verify Ollama is running:

   # Linux/Mac     ```bash

   source venv/bin/activate     ollama list

   ```     ```



3. **Install dependencies:**## Installation

   ```bash

   pip install -r requirements.txt1. **Clone or navigate to the project directory**

   ```   ```bash

   cd Receptrix

4. **Create your `.env` file:**   ```

   ```bash

   copy .env.example .env2. **Create a virtual environment (recommended)**

   ```   ```bash

   python -m venv venv

5. **Edit `.env` with your credentials:**   

   ```env   # On Windows:

   # Twilio Configuration   venv\Scripts\activate

   TWILIO_ACCOUNT_SID=your_account_sid   

   TWILIO_AUTH_TOKEN=your_auth_token   # On macOS/Linux:

   TWILIO_PHONE_NUMBER=+1234567890   source venv/bin/activate

      ```

   # Your Phone Number

   MY_PHONE_NUMBER=+9230952181423. **Install Python dependencies**

      ```bash

   # OpenAI Configuration   pip install -r requirements.txt

   OPENAI_API_KEY=your_openai_api_key   ```

   

   # Server Configuration## Configuration

   SERVER_URL=https://your-ngrok-url.ngrok.io

   PORT=8000Edit `business_config.json` to customize your business details:

   ```

```json

6. **Configure your business in `business_config.json`:**{

   ```json  "business_name": "Your Business Name",

   {  "working_hours": {

     "business_name": "Your Business Name",    "monday": "9:00 AM - 6:00 PM",

     "timezone": "Asia/Karachi",    ...

     "services": [...],  },

     "working_hours": {...},  "services": [

     "contact_info": {...}    {

   }      "name": "Service Name",

   ```      "price": 100,

      "duration": 60

7. **Run the server:**    }

   ```bash  ],

   python main.py  "contact_info": {

   ```    "phone": "+1 (555) 123-4567",

    "email": "info@business.com",

8. **Access the dashboard:**    "address": "123 Main St, City, State"

   Open `http://localhost:8000` in your browser  }

}

## 📱 Twilio Setup```



### Getting a Phone Number## Running the Application



1. Create a [Twilio account](https://www.twilio.com/try-twilio)1. **Start the FastAPI server**

2. Get a phone number with **Voice** capabilities   ```bash

3. For Pakistan, you may need to use a US/UK number and forward calls   python main.py

   ```

### Configuring Webhooks   

   Or using uvicorn directly:

1. Go to [Twilio Console](https://console.twilio.com) → Phone Numbers → Manage → Active Numbers   ```bash

2. Click on your phone number   uvicorn main:app --reload --host 0.0.0.0 --port 8000

3. Under **Voice & Fax**, configure:   ```



   | Setting | Value |2. **Open your browser**

   |---------|-------|   Navigate to: `http://localhost:8000`

   | A CALL COMES IN | Webhook: `https://your-domain.com/voice/incoming` |

   | HTTP Method | POST |The chat interface should load automatically.

   | STATUS CALLBACK URL | `https://your-domain.com/voice/status` |

## API Endpoints

### Using ngrok for Development

- `GET /` - Serves the frontend HTML

```bash- `POST /chat` - Send a chat message and get AI response

# Install ngrok- `GET /services` - Get list of available services

# Download from https://ngrok.com/download- `POST /book` - Create a new booking

- `GET /bookings` - Get all bookings (admin/demo)

# Start ngrok tunnel- `GET /config` - Get business configuration

ngrok http 8000

## Project Structure

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

# Update your .env file with this URL```

# Update Twilio webhook URLsReceptrix/

```├── main.py                 # FastAPI application

├── models.py               # Pydantic data models

## 🏗️ Project Structure├── config.py               # Configuration loader

├── database.py             # SQLite database operations

```├── receptionist.py         # AI receptionist logic

Receptrix/├── business_config.json    # Business configuration

├── main.py              # FastAPI application & endpoints├── requirements.txt        # Python dependencies

├── models.py            # Data models (Pydantic)├── index.html             # Frontend HTML

├── database.py          # SQLite database operations├── style.css              # Frontend styles

├── config.py            # Configuration loader├── script.js              # Frontend JavaScript

├── receptionist.py      # Chat-based AI logic├── receptionist.db        # SQLite database (created automatically)

├── voice_handler.py     # AI voice conversation handler└── README.md              # This file

├── twilio_service.py    # Twilio integration```

├── business_config.json # Business settings

├── .env                 # Environment variables (create this)## How It Works

├── .env.example         # Example environment file

├── requirements.txt     # Python dependencies1. **Intent Detection**: The system uses keyword-based intent detection to categorize user messages (greeting, service inquiry, pricing, hours, booking, etc.)

├── index.html           # Dashboard frontend

├── style.css            # Dashboard styles2. **Response Generation**: 

├── script.js            # Dashboard JavaScript   - For structured queries (services, pricing, hours), rule-based responses are used for consistency

└── receptionist.db      # SQLite database (auto-created)   - For conversational queries (greetings, bookings, general questions), the Ollama LLM generates responses

```

3. **Booking Flow**: When a user expresses interest in booking, the AI guides them through providing necessary information (name, service, date, time), which is then stored in SQLite

## 📡 API Endpoints

4. **Configuration-Driven**: All business details come from `business_config.json`, making it easy to customize without code changes

### Voice Endpoints (Twilio)

| Method | Endpoint | Description |## Customization

|--------|----------|-------------|

| POST | `/voice/incoming` | Handle incoming calls |### Changing the AI Model

| POST | `/voice/respond` | Process speech input |

| POST | `/voice/status` | Call status updates |Edit `receptionist.py`, line 26:

```python

### Chat Endpointsdef __init__(self, model_name: str = "llama3"):

| Method | Endpoint | Description |    # Change "llama3" to any Ollama model you have installed

|--------|----------|-------------|```

| POST | `/chat` | Send chat message |

### Adding New Intents

### Appointment Endpoints

| Method | Endpoint | Description |1. Add a new constant to `IntentType` class in `receptionist.py`

|--------|----------|-------------|2. Add detection logic in `detect_intent()` method

| GET | `/appointments` | List appointments |3. Add handling logic in `generate_response()` method

| POST | `/appointments` | Create appointment |

| GET | `/appointments/availability` | Check time slots |### Database Schema

| PATCH | `/appointments/{id}/status` | Update status |

The bookings table structure:

### Other Endpoints- `id` (INTEGER, PRIMARY KEY)

| Method | Endpoint | Description |- `name` (TEXT)

|--------|----------|-------------|- `service` (TEXT)

| GET | `/services` | List services |- `date` (TEXT, YYYY-MM-DD)

| GET | `/calls` | Get call logs |- `time` (TEXT, HH:MM)

| GET | `/config` | Get business config |- `timestamp` (TEXT, ISO format)

| GET | `/stats` | Dashboard statistics |

| GET | `/health` | Health check |## Troubleshooting



## 🎯 How It Works**Ollama connection errors:**

- Ensure Ollama is running: `ollama list`

### Call Flow- Verify the model is installed: `ollama pull llama3`



1. **Incoming Call** → Twilio forwards to `/voice/incoming`**Port already in use:**

2. **AI Greeting** → Personalized greeting (recognizes returning callers)- Change the port in `main.py` or use: `uvicorn main:app --port 8001`

3. **Speech Recognition** → Twilio transcribes caller's speech

4. **AI Processing** → OpenAI generates natural response**CORS errors:**

5. **Information Extraction** → AI extracts booking details- The current setup allows all origins. In production, update `allow_origins` in `main.py`

6. **Availability Check** → System checks for conflicts

7. **Booking Confirmation** → Appointment created in database## Future Enhancements

8. **Call End** → Transcript saved to call logs

This MVP is designed to be extended for salon-specific features:

### Conversation Example- Multiple business locations

- Service categories and sub-services

```- Booking conflict detection

AI: "Thank you for calling Your Business. My name is Sarah, how may I assist you today?"- Email/SMS notifications

- Customer authentication

Caller: "Hi, I'd like to book an appointment"- Appointment management dashboard

- Payment integration

AI: "I'd be happy to help you book an appointment! What service are you interested in?"

## License

Caller: "I need a consultation"

This is a free, open-source MVP. Customize as needed for your use case.

AI: "Great choice! A consultation is Rs.2000 for 30 minutes. What date works for you?"

## Support

Caller: "Tomorrow at 3pm"

For issues or questions, check that:

AI: "Let me check... Yes, 3 PM tomorrow is available. May I have your name please?"1. Python 3.8+ is installed

2. All dependencies are installed (`pip install -r requirements.txt`)

Caller: "It's Ahmad Khan"3. Ollama is running and llama3 model is pulled

4. The configuration file is valid JSON

AI: "Perfect, Ahmad! I have you down for a Consultation tomorrow at 3 PM. Can you confirm this is correct?"5. Port 8000 is available



Caller: "Yes, that's right"


AI: "Wonderful! Your appointment is confirmed. We'll see you tomorrow at 3 PM. Is there anything else I can help you with?"
```

## ⚙️ Configuration

### Business Config (`business_config.json`)

```json
{
  "business_name": "Your Business Name",
  "timezone": "Asia/Karachi",
  "working_hours": {
    "monday": "9:00 AM - 6:00 PM",
    "tuesday": "9:00 AM - 6:00 PM",
    "wednesday": "9:00 AM - 6:00 PM",
    "thursday": "9:00 AM - 6:00 PM",
    "friday": "9:00 AM - 6:00 PM",
    "saturday": "10:00 AM - 4:00 PM",
    "sunday": "Closed"
  },
  "services": [
    {
      "name": "Consultation",
      "price": 2000,
      "duration": 30,
      "description": "Initial consultation"
    }
  ],
  "contact_info": {
    "phone": "+92 3095218142",
    "email": "info@business.pk",
    "address": "Your Address, City, Pakistan"
  }
}
```

## 🔐 Security Notes

- Never commit `.env` file to version control
- Use HTTPS in production (required for Twilio)
- Implement rate limiting for production
- Add authentication for dashboard in production

## 🐛 Troubleshooting

### Common Issues

1. **"Twilio credentials not configured"**
   - Check your `.env` file has correct Twilio credentials
   - Restart the server after updating `.env`

2. **"OpenAI API error"**
   - Verify your OpenAI API key is valid
   - Check you have credits in your OpenAI account

3. **Calls not connecting**
   - Ensure your ngrok tunnel is running
   - Verify webhook URLs in Twilio console match your server URL
   - Check server logs for errors

4. **Speech not recognized**
   - Speak clearly and at normal pace
   - Ensure good phone connection quality

## 📈 Future Improvements

- [ ] SMS appointment reminders
- [ ] Multi-language support (Urdu)
- [ ] Calendar integration (Google/Outlook)
- [ ] Multiple staff/resource scheduling
- [ ] WhatsApp integration
- [ ] Analytics dashboard
- [ ] Voice customization

## 📄 License

MIT License - Feel free to use and modify for your business!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ for businesses in Pakistan
