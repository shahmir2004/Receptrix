# Receptrix

An AI-powered multi-tenant voice receptionist platform. Handles inbound phone calls via Twilio or SignalWire, books appointments through natural conversation, and provides a web chat interface — all backed by Supabase PostgreSQL and configurable per business.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [System Diagrams](#system-diagrams)
- [Module Reference](#module-reference)
- [Data Model](#data-model)
- [Authentication & Multi-Tenancy](#authentication--multi-tenancy)
- [AI Provider System](#ai-provider-system)
- [Voice Call Flow](#voice-call-flow)
- [Web Chat Flow](#web-chat-flow)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Setup & Running](#setup--running)
- [Deployment](#deployment)

---

## Architecture Overview

Receptrix is a Python/FastAPI server with three main concerns:

| Concern | Entry Point | Backing |
|---|---|---|
| Voice calls | `/voice/incoming`, `/voice/respond` | Twilio or SignalWire webhooks |
| Web chat | `/chat` | Browser → REST API |
| Management | `/business/*`, `/auth/*` | JWT-authenticated REST API |

All data is stored in **Supabase PostgreSQL**. The backend uses the service-role key and bypasses Row Level Security — RLS policies exist for a future browser-direct client path.

Business configuration (name, hours, services) is loaded per-tenant from Supabase and cached in-process for 5 minutes.

---

## System Diagrams

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          RECEPTRIX                              │
│                                                                 │
│  ┌──────────┐   Webhook    ┌─────────────┐   TwiML   ┌──────┐  │
│  │  Twilio  │ ──────────► │  main.py    │ ─────────► │      │  │
│  │    or    │             │  FastAPI    │            │ PSTN │  │
│  │SignalWire│ ◄────────── │  (port 8000)│ ◄───────── │ Call │  │
│  └──────────┘   TwiML     └──────┬──────┘            └──────┘  │
│                                  │                              │
│  ┌──────────┐   HTTP      ┌──────┴──────┐                       │
│  │ Browser  │ ──────────► │  Static     │                       │
│  │Dashboard │             │  Frontend   │                       │
│  └──────────┘             │ (index.html)│                       │
│                           └──────┬──────┘                       │
│                                  │                              │
│            ┌─────────────────────┼──────────────────┐          │
│            │                     │                  │          │
│     ┌──────▼──────┐    ┌─────────▼──────┐  ┌───────▼──────┐   │
│     │voice_handler│   │receptionist.py │  │   auth.py    │   │
│     │ (AI conv.)  │   │  (web chat)    │  │  tenant.py   │   │
│     └──────┬──────┘    └────────────────┘  └───────┬──────┘   │
│            │                                        │          │
│     ┌──────▼────────────────────────────────────────▼──────┐   │
│     │                   database.py                         │   │
│     │            (Supabase PostgreSQL)                      │   │
│     └───────────────────────────────────────────────────────┘   │
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐    │
│     │                   AI Providers                       │    │
│     │   Groq (default) │ OpenAI │ HuggingFace │ Ollama    │    │
│     └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Voice Call Flow

```
Caller dials business number
         │
         ▼
┌─────────────────┐
│ Twilio/SignalWire│
│ POST /voice/    │
│   incoming      │
└────────┬────────┘
         │ CallSid, From, To
         ▼
┌─────────────────┐
│   tenant.py     │  resolve_business_from_phone(To)
│  Phone → Biz   │  Looks up phone_number_mappings table
└────────┬────────┘
         │ business_id
         ▼
┌─────────────────┐
│ voice_handler   │  AIVoiceHandler(business_id)
│ get_greeting()  │  Loads BusinessConfig from Supabase (5-min cache)
│                 │  get_or_create_caller(From)
│                 │  Returns greeting text
└────────┬────────┘
         │ greeting text
         ▼
┌─────────────────┐
│ twilio_service  │  Wraps text in TwiML
│     .py or      │  <Say> + <Gather input="speech"
│signalwire_service│   action="/voice/respond">
└────────┬────────┘
         │ TwiML XML → Twilio speaks to caller, listens

         │ Caller speaks
         ▼
┌─────────────────┐
│ POST /voice/    │
│    respond      │  SpeechResult, CallSid, From, To
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ voice_handler.generate_response()        │
│                                          │
│ 1. Load conversation state (Supabase)    │
│ 2. extract_booking_info() via AI (JSON)  │
│    - name, service, date, time           │
│    - relative dates → absolute dates     │
│ 3. Update context fields                 │
│ 4. Check availability in DB              │
│ 5. If confirming + all info collected    │
│    → create_appointment()                │
│ 6. AI generates spoken reply (≤150 tok)  │
│ 7. Save conversation state               │
│ 8. Detect farewell → should_end_call     │
└────────┬─────────────────────────────────┘
         │ VoiceResponse(text, should_end_call)
         ▼
┌─────────────────┐
│ voice_service   │  TwiML: <Say> + <Gather> or <Hangup>
└────────┬────────┘
         │ TwiML XML
         ▼
   Twilio/SignalWire continues call
```

---

### Web Chat Flow

```
Browser sends message
         │
         ▼
┌─────────────────┐
│  POST /chat     │
│ (optional       │
│ X-Business-Id)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ ReceptionistAI.detect_intent()          │
│                                         │
│  Keyword matching →                     │
│  greeting / service_inquiry /           │
│  pricing_inquiry / working_hours /      │
│  booking_request / contact_info /       │
│  fallback                               │
└────────┬────────────────────────────────┘
         │ intent
         ▼
┌─────────────────────────────────────────┐
│ generate_response()                     │
│                                         │
│  Rule-based: services, pricing,         │
│              hours, contact info        │
│  Groq AI:    greeting, booking,         │
│              fallback                   │
└────────┬────────────────────────────────┘
         │ ChatResponse(message, intent)
         ▼
      Browser
```

---

### Multi-Tenant Auth Flow

```
Client                              Server
  │                                    │
  │  POST /auth/signup                 │
  │ ──────────────────────────────────►│
  │                                    │  Supabase Auth.sign_up()
  │                                    │  Trigger auto-creates profiles row
  │  { user_id, access_token }         │
  │ ◄──────────────────────────────────│
  │                                    │
  │  POST /auth/business               │
  │  Authorization: Bearer <jwt>       │
  │ ──────────────────────────────────►│
  │                                    │  Creates businesses row
  │                                    │  Creates business_memberships (owner)
  │  { business_id, ... }              │
  │ ◄──────────────────────────────────│
  │                                    │
  │  GET /business/settings            │
  │  Authorization: Bearer <jwt>       │
  │  X-Business-Id: <uuid>             │
  │ ──────────────────────────────────►│
  │                                    │  require_business_access():
  │                                    │  1. Validate JWT via Supabase
  │                                    │  2. Check business_memberships
  │  { settings }                      │
  │ ◄──────────────────────────────────│
```

---

### Database Schema

```
┌──────────────┐        ┌──────────────────────┐
│   profiles   │        │      businesses      │
│──────────────│        │──────────────────────│
│ id (UUID)    │        │ id (UUID)            │
│ email        │        │ name                 │
│ full_name    │        │ phone / email        │
└──────┬───────┘        │ address              │
       │                │ timezone             │
       │                │ greeting_message     │
       │                │ working_hours (JSONB)│
       │                └──────────┬───────────┘
       │                           │
       │   ┌───────────────────────┤
       │   │  business_memberships │
       │   │───────────────────────│
       └───┤ user_id (FK profiles) │
           │ business_id (FK biz)  │
           │ role                  │
           │ (owner/admin/staff)   │
           └───────────────────────┘

┌───────────────────────────┐    ┌──────────────────────┐
│   phone_number_mappings   │    │       services       │
│───────────────────────────│    │──────────────────────│
│ phone_number              │    │ id (UUID)            │
│ business_id (FK)          │    │ business_id (FK)     │
│ is_active                 │    │ name / price         │
└───────────────────────────┘    │ duration (minutes)   │
                                 │ description          │
                                 │ is_active            │
                                 └──────────────────────┘

┌────────────────────┐    ┌───────────────────────────┐
│      callers       │    │         call_logs         │
│────────────────────│    │───────────────────────────│
│ id                 │    │ id                        │
│ business_id (FK)   │    │ business_id (FK)          │
│ phone_number       │    │ call_sid                  │
│ name / email       │    │ caller_id (FK)            │
│ notes              │    │ caller_phone              │
│ total_calls        │    │ call_status               │
│ total_appointments │    │ started_at / ended_at     │
└─────────┬──────────┘    │ duration_seconds          │
          │               │ transcript / summary      │
          │               │ appointment_created       │
          │               │ appointment_id            │
          │               └───────────────────────────┘
          │
          ▼
┌─────────────────────────┐    ┌────────────────────────────┐
│      appointments       │    │    conversation_states     │
│─────────────────────────│    │────────────────────────────│
│ id                      │    │ call_sid (PK)              │
│ business_id (FK)        │    │ caller_phone               │
│ caller_id (FK callers)  │    │ state                      │
│ caller_name             │    │ caller_name                │
│ caller_phone            │    │ requested_service          │
│ service_name            │    │ requested_date             │
│ appointment_date        │    │ requested_time             │
│ appointment_time        │    │ messages (JSONB)           │
│ duration_minutes        │    │ extracted_info (JSONB)     │
│ status                  │    │ created_at / updated_at    │
│ notes / reminder_sent   │    └────────────────────────────┘
│ created_at              │
└─────────────────────────┘
```

---

## Module Reference

### [main.py](main.py)
FastAPI application entry point. Registers all routes, CORS middleware, and rate limiting. Serves the static frontend directly.

**Route groups:**
- Auth endpoints (`/auth/*`)
- Business settings CRUD (`/business/*`) — JWT-protected, admin for writes
- Voice webhooks (`/voice/*`) — no auth, called by Twilio/SignalWire
- Chat, appointments, call logs, stats
- Health check with Supabase + AI + voice provider verification

**Rate limits:** 10/min on signup, 20/min on signin, 60/min on chat.

---

### [voice_handler.py](voice_handler.py)
Core AI conversation engine for phone calls.

**`AIProvider` (abstract base class)**  
Implemented by `GroqProvider`, `HuggingFaceProvider`, `OllamaProvider`, `OpenAIProvider`. Selected at startup via `AI_PROVIDER` env var.

**`AIVoiceHandler`**  
One instance per business (cached in `_handlers` dict to avoid cross-tenant config leaks).

| Method | Purpose |
|---|---|
| `get_greeting()` | First message for a new call. Personalizes for returning callers. |
| `generate_response()` | Main conversation loop: loads state → extracts booking info → checks availability → optionally creates appointment → generates spoken reply. |
| `extract_booking_info()` | Calls AI with a structured extraction prompt to parse name/service/date/time from free speech. Returns JSON. Converts relative dates to absolute. |
| `_should_finalize_booking()` | Returns true when name + service + date + time are all known and caller confirms. |
| `_attempt_booking()` | Validates service, checks slot availability, creates appointment row. |
| `_should_end_call()` | Detects farewell phrases in both caller input and AI response. |

---

### [twilio_service.py](twilio_service.py) / [signalwire_service.py](signalwire_service.py)
Voice provider adapters. Both produce TwiML XML. SignalWire reuses Twilio's TwiML library — no SignalWire SDK required.

Selected by `VOICE_PROVIDER` env var (`twilio` or `signalwire`).

Key methods: `handle_incoming_call()`, `handle_speech_input()`, `handle_no_input()`, `handle_call_status()`.

---

### [receptionist.py](receptionist.py)
Web chat handler. Uses keyword-based intent detection followed by rule-based or Groq AI responses.

**Intent types:** `greeting`, `service_inquiry`, `pricing_inquiry`, `working_hours`, `booking_request`, `contact_info`, `fallback`

Rule-based responses for services/pricing/hours/contact (fast, deterministic). Groq AI for greeting/booking/fallback.

---

### [database.py](database.py)
All Supabase PostgreSQL operations. No ORM — direct `supabase-py` queries.

Every function accepts an optional `business_id` parameter. When provided, queries are scoped to that tenant. When `None`, backward-compatible single-tenant behavior applies.

**Operation groups:** callers, call logs, appointments, bookings (legacy), conversation states.

---

### [auth.py](auth.py)
Authentication and authorization FastAPI dependencies.

| Dependency | Requirement |
|---|---|
| `require_auth` | Valid Supabase JWT in `Authorization: Bearer` header |
| `require_business_access` | Auth + membership in the business from `X-Business-Id` header |
| `require_business_admin` | Auth + `owner` or `admin` role in that business |

Also contains `sign_up()`, `sign_in()`, `create_business_for_user()`, `add_business_member()`.

---

### [tenant.py](tenant.py)
Business config resolution and caching.

- `resolve_business_from_phone(to_number)` — maps provider phone number → `business_id` via `phone_number_mappings` table. Used by voice webhooks.
- `get_business_config(business_id)` — loads `BusinessConfig` from Supabase with 5-minute in-process TTL cache.
- `invalidate_config_cache(business_id)` — called after any settings/service update so voice and chat picks up changes immediately.

Falls back to static `business_config.json` via `config.py` when `business_id` is `None`.

---

### [supabase_client.py](supabase_client.py)
Singleton Supabase service-role client. Created once on first call to `get_supabase()`. Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

---

### [config.py](config.py)
Loads `business_config.json` from disk. Cached singleton via `get_config()`. Used as fallback in single-tenant mode and by the legacy `/book` endpoint.

---

### [logging_config.py](logging_config.py)
Structured logging setup. All modules use `get_logger(__name__)`.

| Env var | Default | Options |
|---|---|---|
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `LOG_FORMAT` | `text` | `text`, `json` (structured for production) |

---

### [models.py](models.py)
Pydantic v2 models: `BusinessConfig`, `WorkingHours`, `Service`, `ContactInfo`, `Caller`, `CallLog`, `Appointment`, `AppointmentCreate`, `ConversationState`, `VoiceResponse`, `ChatRequest`, `ChatResponse`, `Booking`.

---

### Frontend: [index.html](index.html) / [style.css](style.css) / [script.js](script.js)
Single-page dashboard served as static files by FastAPI. No build step required.

Features: appointment list, call logs, live chat interface, business settings panel. Sends `X-Business-Id` header on all API calls after login.

---

## Data Model

### Appointment Status
`scheduled` → `confirmed` → `completed` | `cancelled` | `no_show`

### Call Status
`incoming` → `in_progress` → `completed` | `failed` | `no_answer`

### Business Member Roles
- `owner` — full access, can manage members
- `admin` — can edit settings and services
- `staff` — read-only access

---

## Authentication & Multi-Tenancy

Each business is isolated by `business_id` (UUID). All tenant-scoped DB functions filter by this field.

**User onboarding:**
1. `POST /auth/signup` → Supabase creates auth user + profile row
2. `POST /auth/business` → Creates business, assigns caller as `owner`
3. All requests: `Authorization: Bearer <access_token>` + `X-Business-Id: <uuid>`

**Voice webhook tenant resolution:**  
Voice webhooks carry no JWT. The business is resolved from the `To` phone number via the `phone_number_mappings` table. Add a row there mapping each provider phone number to its `business_id`.

**Adding team members:**  
`POST /auth/business/members` with `{ email, role }` — user must already have a Receptrix account.

---

## AI Provider System

Selected by the `AI_PROVIDER` environment variable:

| Provider | Env var | Default model | Notes |
|---|---|---|---|
| `groq` (default) | `GROQ_API_KEY` | `llama-3.1-8b-instant` | Fast, free tier available |
| `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` | Paid |
| `huggingface` | `HUGGINGFACE_API_KEY` | `mistralai/Mistral-7B-Instruct-v0.2` | Free tier |
| `ollama` | none | `llama3` | Local, requires Ollama running |

Model can be overridden per-provider: `GROQ_MODEL`, `OPENAI_MODEL`, `HUGGINGFACE_MODEL`, `OLLAMA_MODEL`.

All providers implement the `AIProvider` abstract base class with a single `chat(messages, temperature, max_tokens)` method.

Voice responses are capped at 150 tokens (concise for phone speech). Chat responses allow up to 300 tokens.

---

## Voice Call Flow

Detailed lifecycle:

1. **Incoming**: Twilio/SignalWire POSTs to `/voice/incoming` with `CallSid`, `From` (caller), `To` (your number).
2. **Tenant resolution**: `To` is looked up in `phone_number_mappings` to get `business_id`.
3. **Caller lookup**: `get_or_create_caller()` finds or creates the caller, increments `total_calls`.
4. **Greeting**: Personalized for returning callers with a known name; generic for new callers.
5. **TwiML response**: `<Say>` greeting + `<Gather input="speech" action="/voice/respond">`.
6. **Speech input**: Twilio/SignalWire POSTs to `/voice/respond` with `SpeechResult`.
7. **Extraction**: AI parses name, service, date, time from free speech. Relative dates ("tomorrow") converted to absolute.
8. **Availability**: If a date is known, available slots are fetched and injected into AI context.
9. **Booking**: When all four fields collected and caller confirms → `create_appointment()`.
10. **State persistence**: Full message history saved to `conversation_states` between webhook calls.
11. **Call end**: Farewell phrases in caller speech + AI reply → `<Hangup>`.

**No-input**: `/voice/no-input` prompts the caller to speak again.

---

## Web Chat Flow

1. Browser sends `POST /chat` with `{ message, conversation_history }` and optional `X-Business-Id` header.
2. `ReceptionistAI.detect_intent()` classifies the message by keyword matching.
3. Rule-based responses for services, pricing, hours, contact info (fast and consistent).
4. Groq AI for greeting, booking requests, and fallback (last 5 messages as context).
5. Returns `{ message, intent }`.

---

## API Reference

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | none | Register new user |
| POST | `/auth/signin` | none | Sign in, returns tokens + businesses |
| GET | `/auth/me` | JWT | Current user profile + memberships |
| POST | `/auth/business` | JWT | Create a new business |
| POST | `/auth/business/members` | JWT + admin | Add team member by email |

### Business Settings

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/business/settings` | JWT + member | Get business settings |
| PATCH | `/business/settings` | JWT + admin | Update business settings |
| GET | `/business/services` | JWT + member | List all services |
| POST | `/business/services` | JWT + admin | Create service |
| PATCH | `/business/services/{id}` | JWT + admin | Update service |
| DELETE | `/business/services/{id}` | JWT + admin | Soft-delete service |

### Voice Webhooks (no auth — Twilio/SignalWire only)

| Method | Path | Description |
|---|---|---|
| POST | `/voice/incoming` | Handle new inbound call |
| POST | `/voice/respond` | Handle caller speech input |
| POST | `/voice/no-input` | Handle silence / no input |
| POST | `/voice/status` | Call status updates |

### Chat & Data

| Method | Path | Description |
|---|---|---|
| POST | `/chat` | Web chat message |
| GET | `/services` | List services (tenant-aware via `X-Business-Id`) |
| POST | `/appointments` | Create appointment |
| GET | `/appointments` | List appointments (optional `?date=`) |
| GET | `/appointments/availability` | Check available slots |
| PATCH | `/appointments/{id}/status` | Update appointment status |
| GET | `/calls` | Get call logs |
| GET | `/config` | Get business config |
| GET | `/stats` | Dashboard statistics |

### Health & Debug

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check — Supabase + AI + voice provider |
| GET | `/debug/ai` | Test AI provider connectivity |
| GET | `/debug/voice` | Test full voice handler response |

> Tenant-aware endpoints read the `X-Business-Id` header to scope data. Without it they fall back to single-tenant mode using `business_config.json`.

---

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Provider
AI_PROVIDER=groq                         # groq | openai | huggingface | ollama
GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama-3.1-8b-instant         # optional override
# OPENAI_API_KEY=...
# OPENAI_MODEL=gpt-4o-mini
# HUGGINGFACE_API_KEY=...
# OLLAMA_URL=http://localhost:11434

# Voice Provider
VOICE_PROVIDER=twilio                    # twilio | signalwire
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
# SIGNALWIRE_PROJECT_ID=...
# SIGNALWIRE_API_TOKEN=...
# SIGNALWIRE_SPACE_URL=...
# SIGNALWIRE_PHONE_NUMBER=+1...

# Server
SERVER_URL=https://your-app.onrender.com
PORT=8000

# CORS (comma-separated origins; omit for wildcard *)
ALLOWED_ORIGINS=https://your-frontend.com

# Logging
LOG_LEVEL=INFO                           # DEBUG | INFO | WARNING | ERROR
LOG_FORMAT=text                          # text | json
```

### Business Config (single-tenant fallback)

`business_config.json` is used when no `business_id` is provided via header:

```json
{
  "business_name": "My Business",
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
    { "name": "Consultation", "price": 500, "duration": 30 }
  ],
  "contact_info": {
    "phone": "+92-XXX-XXXXXXX",
    "email": "info@yourbusiness.com",
    "address": "123 Main St"
  }
}
```

---

## Setup & Running

```bash
# 1. Create and activate virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. Run
python main.py
# or with hot-reload for development:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open `http://localhost:8000` for the dashboard.

### Voice Webhook Setup

For local development, expose your server with [ngrok](https://ngrok.com):

```bash
ngrok http 8000
```

Configure your Twilio or SignalWire phone number:
- **Incoming call webhook**: `https://your-ngrok-url.ngrok.io/voice/incoming`
- **Status callback**: `https://your-ngrok-url.ngrok.io/voice/status`
- **Method**: POST

For multi-tenant routing, add a row to the `phone_number_mappings` table mapping each provider phone number to the correct `business_id`.

---

## Deployment

### Render

A `render.yaml` is included. Start command:

```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Set all environment variables in the Render dashboard under **Environment**.

### Heroku

A `Procfile` is included:

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Database Migrations

Schema is managed via Supabase migrations in `supabase/migrations/`. Apply with:

```bash
supabase db push
```

or run the SQL files manually in the Supabase SQL editor.

**Python 3.11+ required.**
