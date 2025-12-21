# 🤖 Receptrix - AI Voice Receptionist# 📞 Receptrix - AI Voice Receptionist# AI Receptionist MVP



An autonomous AI-powered voice receptionist system that handles phone calls, manages appointments, and provides intelligent customer service for any business.



![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)An autonomous AI-powered receptionist that handles phone calls, schedules appointments, and manages your business communications automatically.A generic, production-style AI-powered virtual receptionist system built with Python FastAPI, Ollama (Llama 3), SQLite, and vanilla JavaScript.

![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)

![Twilio](https://img.shields.io/badge/Twilio-Voice-red.svg)

![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Features## Overview

## ✨ Features



- **🎙️ Voice Call Handling** - Answers incoming calls via Twilio with natural AI conversation

- **📅 Appointment Management** - Books, reschedules, and cancels appointments automatically- **🤖 AI Voice Handling**: Natural conversation with callers using OpenAI GPTThis system acts as a virtual receptionist that can:

- **🧠 Multi-AI Provider Support** - Works with Groq (free), OpenAI, HuggingFace, or Ollama

- **📊 Real-time Dashboard** - Web interface to monitor calls, appointments, and statistics- **📞 Phone Integration**: Twilio-powered phone call handling with speech-to-text- Handle customer conversations via chat

- **🌍 Timezone Aware** - Configurable business hours and timezone support

- **💾 Persistent Storage** - SQLite database for all appointments, callers, and call logs- **📅 Smart Scheduling**: Automatic appointment booking with conflict detection- Answer business FAQs

- **🔄 Conflict Detection** - Prevents double-booking with smart availability checking

- **👤 Caller Recognition**: Remembers returning callers by phone number- Provide service information and pricing

## 🏗️ Architecture

- **📊 Dashboard**: Web interface to manage appointments and view call logs- Share working hours and contact information

```

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐- **💬 Chat Interface**: Test the AI receptionist via web chat- Process appointment bookings

│   Phone Call    │────▶│     Twilio      │────▶│   FastAPI App   │

│   (Customer)    │     │   (Voice API)   │     │   (Webhooks)    │- **🇵🇰 Pakistan Optimized**: Configured for PKT timezone and local phone numbers- Store bookings in a database

└─────────────────┘     └─────────────────┘     └────────┬────────┘

                                                         │

                        ┌────────────────────────────────┼────────────────────────────────┐

                        │                                ▼                                │## 🚀 Quick Start## Tech Stack

                        │  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────┐  │

                        │  │  Voice Handler  │──▶│   AI Provider   │   │   Database   │  │

                        │  │  (Conversation) │   │ (Groq/OpenAI)   │   │   (SQLite)   │  │

                        │  └─────────────────┘   └─────────────────┘   └──────────────┘  │### Prerequisites- **Backend**: Python 3.8+ with FastAPI

                        │                                                                 │

                        │                    Receptrix Server                             │- **AI**: Ollama with Llama 3 model

                        └─────────────────────────────────────────────────────────────────┘

```- Python 3.9+- **Database**: SQLite



## 📁 Project Structure- Twilio Account (for phone calls)- **Frontend**: HTML, CSS, Vanilla JavaScript



```- OpenAI API Key (for AI responses)- **Configuration**: JSON file

Receptrix/

├── main.py              # FastAPI application & API endpoints- ngrok or public server (for Twilio webhooks)

├── voice_handler.py     # AI conversation handler for voice calls

├── twilio_service.py    # Twilio integration & TwiML generation## Prerequisites

├── receptionist.py      # Core receptionist AI logic

├── database.py          # SQLite database operations### Installation

├── models.py            # Pydantic data models

├── config.py            # Configuration management1. **Python 3.8 or higher**

├── business_config.json # Business settings (hours, services, etc.)

├── index.html           # Dashboard frontend1. **Clone and navigate to the project:**   ```bash

├── style.css            # Dashboard styling

├── script.js            # Dashboard JavaScript   ```bash   python --version

├── requirements.txt     # Python dependencies

├── Procfile             # Render deployment config   cd Receptrix   ```

├── render.yaml          # Render service definition

├── runtime.txt          # Python version specification   ```

├── .env.example         # Environment variables template

└── README.md            # This file2. **Ollama installed and running**

```

2. **Create a virtual environment:**   - Download from: https://ollama.ai/

## 🚀 Quick Start

   ```bash   - Install Ollama on your system

### Prerequisites

   python -m venv venv   - Pull the Llama 3 model:

- Python 3.11+

- Twilio Account (for phone calls)        ```bash

- Groq API Key (free) or OpenAI API Key

   # Windows     ollama pull llama3

### 1. Clone the Repository

   venv\Scripts\activate     ```

```bash

git clone https://github.com/shahmir2004/Receptrix.git      - Verify Ollama is running:

cd Receptrix

```   # Linux/Mac     ```bash



### 2. Create Virtual Environment   source venv/bin/activate     ollama list



```bash   ```     ```

python -m venv venv



# Windows

venv\Scripts\activate3. **Install dependencies:**## Installation



# Linux/Mac   ```bash

source venv/bin/activate

```   pip install -r requirements.txt1. **Clone or navigate to the project directory**



### 3. Install Dependencies   ```   ```bash



```bash   cd Receptrix

pip install -r requirements.txt

```4. **Create your `.env` file:**   ```



### 4. Configure Environment Variables   ```bash



Copy the example environment file and fill in your credentials:   copy .env.example .env2. **Create a virtual environment (recommended)**



```bash   ```   ```bash

cp .env.example .env

```   python -m venv venv



Edit `.env` with your settings:5. **Edit `.env` with your credentials:**   



```env   ```env   # On Windows:

# AI Provider (groq, openai, huggingface, ollama)

AI_PROVIDER=groq   # Twilio Configuration   venv\Scripts\activate

GROQ_API_KEY=your-groq-api-key

   TWILIO_ACCOUNT_SID=your_account_sid   

# Twilio Credentials

TWILIO_ACCOUNT_SID=your-twilio-sid   TWILIO_AUTH_TOKEN=your_auth_token   # On macOS/Linux:

TWILIO_AUTH_TOKEN=your-twilio-token

TWILIO_PHONE_NUMBER=+1234567890   TWILIO_PHONE_NUMBER=+1234567890   source venv/bin/activate



# Business Settings      ```

BUSINESS_NAME=Your Business Name

BUSINESS_TIMEZONE=Asia/Karachi   # Your Phone Number

```

   MY_PHONE_NUMBER=+9230952181423. **Install Python dependencies**

### 5. Run the Server

      ```bash

```bash

python main.py   # OpenAI Configuration   pip install -r requirements.txt

```

   OPENAI_API_KEY=your_openai_api_key   ```

The server will start at `http://localhost:8000`

   

## 🌐 Deployment on Render

   # Server Configuration## Configuration

### 1. Push to GitHub

   SERVER_URL=https://your-ngrok-url.ngrok.io

```bash

git add .   PORT=8000Edit `business_config.json` to customize your business details:

git commit -m "Initial commit"

git push origin main   ```

```

```json

### 2. Create Render Service

6. **Configure your business in `business_config.json`:**{

1. Go to [render.com](https://render.com) and sign up/login

2. Click **New +** → **Web Service**   ```json  "business_name": "Your Business Name",

3. Connect your GitHub repository

4. Configure:   {  "working_hours": {

   - **Name**: `receptrix`

   - **Runtime**: Python 3     "business_name": "Your Business Name",    "monday": "9:00 AM - 6:00 PM",

   - **Build Command**: `pip install -r requirements.txt`

   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`     "timezone": "Asia/Karachi",    ...



### 3. Add Environment Variables     "services": [...],  },



In Render dashboard, add these environment variables:     "working_hours": {...},  "services": [



| Key | Value |     "contact_info": {...}    {

|-----|-------|

| `AI_PROVIDER` | `groq` |   }      "name": "Service Name",

| `GROQ_API_KEY` | `your-groq-api-key` |

| `TWILIO_ACCOUNT_SID` | `your-twilio-sid` |   ```      "price": 100,

| `TWILIO_AUTH_TOKEN` | `your-twilio-token` |

| `TWILIO_PHONE_NUMBER` | `+your-twilio-number` |      "duration": 60

| `BUSINESS_NAME` | `Your Business Name` |

| `BUSINESS_TIMEZONE` | `Asia/Karachi` |7. **Run the server:**    }



### 4. Configure Twilio Webhooks   ```bash  ],



After deployment, configure your Twilio phone number:   python main.py  "contact_info": {



1. Go to [Twilio Console](https://console.twilio.com)   ```    "phone": "+1 (555) 123-4567",

2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**

3. Click on your phone number    "email": "info@business.com",

4. Under **Voice Configuration**:

   - **A Call Comes In**: Webhook8. **Access the dashboard:**    "address": "123 Main St, City, State"

   - **URL**: `https://your-app.onrender.com/voice/incoming`

   - **HTTP Method**: POST   Open `http://localhost:8000` in your browser  }



## 📡 API Endpoints}



### Voice Endpoints (Twilio Webhooks)## 📱 Twilio Setup```



| Endpoint | Method | Description |

|----------|--------|-------------|

| `/voice/incoming` | POST | Handles incoming calls from Twilio |### Getting a Phone Number## Running the Application

| `/voice/process` | POST | Processes speech input and generates AI response |

| `/voice/transcribe` | POST | Handles speech transcription |



### Dashboard Endpoints1. Create a [Twilio account](https://www.twilio.com/try-twilio)1. **Start the FastAPI server**



| Endpoint | Method | Description |2. Get a phone number with **Voice** capabilities   ```bash

|----------|--------|-------------|

| `/` | GET | Dashboard web interface |3. For Pakistan, you may need to use a US/UK number and forward calls   python main.py

| `/stats` | GET | Get dashboard statistics |

| `/config` | GET | Get business configuration |   ```

| `/appointments` | GET | List all appointments |

| `/appointments` | POST | Create new appointment |### Configuring Webhooks   

| `/calls` | GET | Get call logs |

| `/available-slots` | GET | Get available time slots |   Or using uvicorn directly:



### Chat Endpoints1. Go to [Twilio Console](https://console.twilio.com) → Phone Numbers → Manage → Active Numbers   ```bash



| Endpoint | Method | Description |2. Click on your phone number   uvicorn main:app --reload --host 0.0.0.0 --port 8000

|----------|--------|-------------|

| `/chat` | POST | Send message to AI receptionist |3. Under **Voice & Fax**, configure:   ```

| `/book` | POST | Book an appointment |

| `/bookings` | GET | Get all bookings |



## ⚙️ Configuration   | Setting | Value |2. **Open your browser**



### Business Configuration (`business_config.json`)   |---------|-------|   Navigate to: `http://localhost:8000`



```json   | A CALL COMES IN | Webhook: `https://your-domain.com/voice/incoming` |

{

  "business_name": "Your Business",   | HTTP Method | POST |The chat interface should load automatically.

  "business_hours": {

    "monday": {"open": "09:00", "close": "18:00"},   | STATUS CALLBACK URL | `https://your-domain.com/voice/status` |

    "tuesday": {"open": "09:00", "close": "18:00"}

  },## API Endpoints

  "services": [

    {"name": "Consultation", "duration": 30, "price": 1000},### Using ngrok for Development

    {"name": "Follow-up", "duration": 15, "price": 500}

  ],- `GET /` - Serves the frontend HTML

  "timezone": "Asia/Karachi",

  "currency": "PKR",```bash- `POST /chat` - Send a chat message and get AI response

  "phone_number": "+923095218142"

}# Install ngrok- `GET /services` - Get list of available services

```

# Download from https://ngrok.com/download- `POST /book` - Create a new booking

### AI Providers

- `GET /bookings` - Get all bookings (admin/demo)

| Provider | Free Tier | Model |

|----------|-----------|-------|# Start ngrok tunnel- `GET /config` - Get business configuration

| **Groq** | ✅ Yes | Llama 3 70B |

| OpenAI | ❌ Paid | GPT-4 |ngrok http 8000

| HuggingFace | ✅ Limited | Various |

| Ollama | ✅ Local | Various |## Project Structure



## 🔧 Development# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)



### Running Locally with ngrok# Update your .env file with this URL```



For local development with Twilio:# Update Twilio webhook URLsReceptrix/



```bash```├── main.py                 # FastAPI application

# Terminal 1: Start the server

python main.py├── models.py               # Pydantic data models



# Terminal 2: Start ngrok tunnel## 🏗️ Project Structure├── config.py               # Configuration loader

ngrok http 8000

```├── database.py             # SQLite database operations



Use the ngrok URL for Twilio webhooks during development.```├── receptionist.py         # AI receptionist logic



### Database SchemaReceptrix/├── business_config.json    # Business configuration



The application uses SQLite with the following tables:├── main.py              # FastAPI application & endpoints├── requirements.txt        # Python dependencies



- **callers** - Stores caller information (phone, name, preferences)├── models.py            # Data models (Pydantic)├── index.html             # Frontend HTML

- **appointments** - Stores all appointments with status tracking

- **call_logs** - Logs all incoming calls with transcripts├── database.py          # SQLite database operations├── style.css              # Frontend styles

- **bookings** - Legacy booking system for web interface

├── config.py            # Configuration loader├── script.js              # Frontend JavaScript

## 🤝 Contributing

├── receptionist.py      # Chat-based AI logic├── receptionist.db        # SQLite database (created automatically)

1. Fork the repository

2. Create a feature branch (`git checkout -b feature/amazing-feature`)├── voice_handler.py     # AI voice conversation handler└── README.md              # This file

3. Commit your changes (`git commit -m 'Add amazing feature'`)

4. Push to the branch (`git push origin feature/amazing-feature`)├── twilio_service.py    # Twilio integration```

5. Open a Pull Request

├── business_config.json # Business settings

## 📄 License

├── .env                 # Environment variables (create this)## How It Works

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

├── .env.example         # Example environment file

## 🙏 Acknowledgments

├── requirements.txt     # Python dependencies1. **Intent Detection**: The system uses keyword-based intent detection to categorize user messages (greeting, service inquiry, pricing, hours, booking, etc.)

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework

- [Twilio](https://www.twilio.com/) - Voice and messaging APIs├── index.html           # Dashboard frontend

- [Groq](https://groq.com/) - Fast AI inference

- [Render](https://render.com/) - Cloud hosting platform├── style.css            # Dashboard styles2. **Response Generation**: 



## 📞 Support├── script.js            # Dashboard JavaScript   - For structured queries (services, pricing, hours), rule-based responses are used for consistency



For support, please open an issue on GitHub or contact the maintainers.└── receptionist.db      # SQLite database (auto-created)   - For conversational queries (greetings, bookings, general questions), the Ollama LLM generates responses



---```



**Made with ❤️ by Shahmir**3. **Booking Flow**: When a user expresses interest in booking, the AI guides them through providing necessary information (name, service, date, time), which is then stored in SQLite


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
