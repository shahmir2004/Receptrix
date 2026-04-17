# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Receptrix

Receptrix is an AI-powered voice receptionist system that handles phone calls (via Twilio or SignalWire), manages appointments, and provides a web chat interface. Built with Python/FastAPI, SQLite, and a vanilla JS frontend.

## Development Commands

```bash
# Install dependencies (use a venv)
pip install -r requirements.txt

# Run the server
python main.py
# Or directly with uvicorn:
uvicorn main:app --host 0.0.0.0 --port 8000

# Production (Render/Heroku)
uvicorn main:app --host 0.0.0.0 --port $PORT
```

No test suite exists. No linter configuration exists.

## Architecture

**Request flow for voice calls:**
Phone call → Twilio/SignalWire webhook → `main.py` (`/voice/incoming`, `/voice/respond`) → `twilio_service.py` or `signalwire_service.py` (selected by `VOICE_PROVIDER` env var) → `voice_handler.py` (AI conversation logic) → TwiML response back to caller

**Request flow for web chat:**
Browser → `main.py` (`/chat`) → `receptionist.py` (intent detection + response generation)

### Key modules

- **main.py** — FastAPI app with all API endpoints. Serves static frontend files directly (no build step). Initializes DB and config at startup.
- **voice_handler.py** — Multi-provider AI handler for phone conversations. Supports Groq, HuggingFace, Ollama, and OpenAI via an `AIProvider` abstract base class. Manages conversation state, appointment booking during calls.
- **twilio_service.py / signalwire_service.py** — Voice provider integrations. Both produce TwiML responses. SignalWire reuses Twilio's TwiML library without the SignalWire SDK.
- **receptionist.py** — `ReceptionistAI` class for the web chat interface. Uses keyword-based intent detection (greeting, service inquiry, pricing, booking, etc.).
- **database.py** — All SQLite operations. Direct `sqlite3` usage (no ORM). Tables: `bookings` (legacy), `callers`, `call_logs`, `appointments`, `conversation_states`. DB file: `receptionist.db`.
- **models.py** — Pydantic models for all data types (appointments, callers, call logs, conversation state, business config).
- **config.py** — Loads `business_config.json` and env vars. Cached singleton pattern for `BusinessConfig`.

### Frontend

Single-page app: `index.html`, `style.css`, `script.js`. Served as static files by FastAPI (no bundler). The dashboard shows appointments, call logs, and chat interface.

## Configuration

- **business_config.json** — Business name, working hours, services (name/price/duration), contact info, timezone.
- **.env** — AI provider selection (`AI_PROVIDER`), API keys (Groq/OpenAI/HuggingFace), Twilio/SignalWire credentials, `SERVER_URL`, `VOICE_PROVIDER` (twilio or signalwire). See `.env.example` for all variables.

## Deployment

Configured for Render (`render.yaml`) and Heroku (`Procfile`). Python 3.11+.

## Codebase Search

A code knowledge graph is available via the `code-review-graph` MCP. Prefer using it over manual file searches:

- **Semantic search** — use `semantic_search_nodes_tool` to find functions/classes by concept
- **Call chains** — use `query_graph` with `callers_of` / `callees_of` to trace execution flows
- **Architecture** — use `get_architecture_overview_tool` to understand module boundaries
- **Impact analysis** — use `get_impact_radius` before modifying a file
- **Change review** — use `detect_changes_tool` to see what a diff affects

The graph covers 317 nodes (15 files, Python + JS) with semantic embeddings active. Visualize at `.code-review-graph/graph.html` or run `python -m code_review_graph visualize --serve`.
