# Receptrix — SQLite → Supabase Multi-Tenant Migration Status

**Supabase Project:** `umcqraqzjledqrxirqrl`
**URL:** `https://umcqraqzjledqrxirqrl.supabase.co`
**Region:** ap-south-1
**Last updated:** 2026-04-04 (Phase H complete)

---

## Completed Phases

### Phase A: Supabase Foundation (Schema Only) ✅

Created the multi-tenant PostgreSQL schema via Supabase migrations. No Python changes — SQLite stayed operational during this phase.

**Migrations applied (001–010):**

| # | File | Purpose |
|---|------|---------|
| 001 | `create_businesses.sql` | `businesses` table + `set_updated_at()` trigger function |
| 002 | `create_profiles.sql` | `profiles` table (1:1 mirror of `auth.users`) |
| 003 | `create_business_memberships.sql` | `business_memberships` join table (user ↔ business, with role) |
| 004 | `create_services.sql` | `services` table (replaces `business_config.json` services array) |
| 005 | `create_legacy_bookings.sql` | `bookings` table (SERIAL PK, matches SQLite schema exactly) |
| 006 | `create_callers.sql` | `callers` table with nullable `business_id`, per-tenant phone uniqueness |
| 007 | `create_appointments.sql` | `appointments` table with CHECK constraints matching Python enums |
| 008 | `create_call_logs.sql` | `call_logs` table with CHECK constraints matching Python enums |
| 009 | `create_conversation_states.sql` | `conversation_states` table (TEXT PK on `call_sid`, JSONB columns) |
| 010 | `seed_demo_business.sql` | Demo business + 3 services + placeholder owner profile |

**Key design decisions:**
- UUID PKs for new tables (businesses, profiles, memberships, services)
- SERIAL integer PKs on legacy tables (bookings, callers, appointments, call_logs) — matches existing Python models
- `business_id` **nullable** on legacy tables — deferred to NOT NULL after data migration
- CHECK constraints instead of PG ENUMs (easier to ALTER later)
- `date`/`time` stored as TEXT (exact match to Python Pydantic string fields)
- `working_hours` as JSONB on businesses table
- `messages`/`extracted_info` as native JSONB on conversation_states

---

### Phase B: RLS & Auth Policies ✅

Enabled Row Level Security on all 9 tables and created access policies.

**Migration applied:**
| # | File | Purpose |
|---|------|---------|
| 011 | `enable_rls_policies.sql` | RLS + all policies + 3 SECURITY DEFINER helper functions |

**SECURITY DEFINER helper functions** (prevent infinite recursion when policies query `business_memberships`):
- `auth_is_member_of(business_id UUID)` — checks if current user is any member of a business
- `auth_is_owner_or_admin(business_id UUID)` — checks for owner/admin role
- `auth_is_owner(business_id UUID)` — checks for owner role only

**Policy summary:**
| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Own row | Own row | Own row | — |
| businesses | Members | — | Owner/admin | — |
| business_memberships | Own rows | Owners | — | Owners |
| services | Members | Owner/admin | Owner/admin | Owner/admin |
| callers | Members (or NULL biz) | Members | Members | Owner/admin |
| appointments | Members (or NULL biz) | Members | Members | Owner/admin |
| call_logs | Members (or NULL biz) | — | Owner/admin | — |
| conversation_states | — (backend-only) | — | — | — |
| bookings | — (backend-only) | — | — | — |

**Important:** The Python backend uses the **service-role key** which bypasses all RLS. These policies only affect direct Supabase client access (future React frontend via anon/JWT key).

---

### Phase C: Replace SQLite with Supabase Repository Layer ✅

Rewrote `database.py` from raw SQLite to Supabase Python SDK. All function signatures preserved — zero changes needed in `main.py`, `voice_handler.py`, or `signalwire_service.py`.

**Files created:**
| File | Purpose |
|------|---------|
| `supabase_client.py` | Singleton Supabase client using service-role key |
| `supabase/migrations/012_callers_null_business_unique_phone.sql` | Partial unique index for `phone_number` when `business_id IS NULL` |

**Files modified:**
| File | Change |
|------|--------|
| `database.py` | Full rewrite: SQLite → Supabase SDK (`sb.table().select().eq().execute()` pattern) |
| `config.py` | Added `get_supabase_config()` helper |
| `main.py` | Removed `init_database()` call (now no-op) |
| `.env.example` | Added `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `requirements.txt` | Added `supabase>=2.3.0` |

**Key implementation details:**
- `save_conversation_state()` uses SELECT-then-INSERT-or-UPDATE pattern (preserves `created_at`)
- JSONB columns handled natively by Supabase SDK (no `json.dumps`/`json.loads` needed)
- `CallStatus` and `AppointmentStatus` re-exported from `database.py` for backward compat
- Partial unique index on `callers(phone_number) WHERE business_id IS NULL` prevents duplicate callers in single-tenant mode

**Verified:** Insert and uniqueness constraints working correctly on live Supabase instance.

---

### Phase D: Auth & Tenant Resolution ✅

Added Supabase Auth integration, JWT-protected API endpoints, business onboarding, per-tenant config loading from Supabase, and tenant resolution for voice webhooks via phone number mapping.

**Migrations applied:**
| # | File | Purpose |
|---|------|---------|
| 013 | `create_phone_number_mappings.sql` | `phone_number_mappings` table — maps provider phone numbers to `business_id` for tenant resolution on incoming calls. RLS enabled with member/admin policies. Seeded with demo business placeholder. |
| 014 | `auth_trigger_create_profile.sql` | `handle_new_user()` trigger on `auth.users` — auto-creates a `profiles` row on sign-up so profiles always mirrors auth.users without manual INSERT. |

**Files created:**
| File | Purpose |
|------|---------|
| `auth.py` | JWT validation via `sb.auth.get_user(token)`, FastAPI dependencies (`require_auth`, `require_business_access`, `require_business_admin`), sign-up/sign-in functions, business onboarding (`create_business_for_user`), member management (`add_business_member`) |
| `tenant.py` | Tenant resolution: `resolve_business_from_phone(to_number)` queries `phone_number_mappings` to find `business_id`. Business config loader: `get_business_config(business_id)` fetches from Supabase `businesses` + `services` tables and returns a `BusinessConfig` Pydantic model. 5-minute TTL cache to avoid repeated queries during a call. Falls back to `business_config.json` when `business_id` is None. |
| `supabase/migrations/013_create_phone_number_mappings.sql` | Local migration file |
| `supabase/migrations/014_auth_trigger_create_profile.sql` | Local migration file |

**Files modified:**
| File | Change |
|------|--------|
| `database.py` | All tenant-scoped functions now accept optional `business_id` parameter. When provided, queries filter/insert with `business_id`. When None, backward-compatible single-tenant behavior. |
| `voice_handler.py` | `AIVoiceHandler` constructor accepts `business_id`, loads config via `tenant.get_business_config()` instead of `config.get_config()`. All DB calls pass `business_id`. Handler registry keyed by `business_id` (one handler per tenant). |
| `signalwire_service.py` | Added `_resolve_business(to_number)` method. `handle_incoming_call` and `handle_speech_input` accept `to_number` parameter and resolve tenant before calling voice handler. |
| `twilio_service.py` | Same changes as `signalwire_service.py` — tenant resolution from `To` number. |
| `receptionist.py` | Constructor accepts optional `business_id`, loads config via `tenant.get_business_config()`. |
| `main.py` | Added auth endpoints (`/auth/signup`, `/auth/signin`, `/auth/me`, `/auth/business`, `/auth/business/members`). Voice endpoints now pass `To` form field to voice services. Dashboard/API endpoints read `X-Business-Id` header for tenant scoping. Version bumped to 3.0.0. |

**Auth flow:**
1. `POST /auth/signup` — creates Supabase Auth user → trigger auto-creates `profiles` row → returns tokens
2. `POST /auth/signin` — authenticates, returns tokens + list of business memberships
3. `POST /auth/business` — creates new business + owner membership (requires JWT)
4. `GET /auth/me` — returns profile + memberships (requires JWT)
5. `POST /auth/business/members` — adds staff/admin to business (requires owner/admin JWT + `X-Business-Id`)

**Tenant resolution flow (voice calls):**
```
Incoming call → Twilio/SignalWire webhook with To=+1234567890
  → voice service._resolve_business("+1234567890")
    → SELECT business_id FROM phone_number_mappings WHERE phone_number = '+1234567890'
      → business_id (UUID)
  → get_voice_handler(business_id)
    → loads BusinessConfig from Supabase businesses + services tables
  → all DB operations scoped to business_id
```

**Tenant resolution flow (web/API):**
```
HTTP request with headers:
  Authorization: Bearer <supabase-jwt>
  X-Business-Id: <uuid>
  → require_auth() validates JWT via sb.auth.get_user(token)
  → require_business_access() checks business_memberships
  → business_id used to scope all queries
```

**Key design decisions:**
- JWT validation uses `sb.auth.get_user(token)` (round-trip to Supabase Auth) rather than local JWT decode — simpler, no need for JWT secret in env, handles token revocation
- Voice endpoints remain unauthenticated (they're webhook callbacks from the provider, not user requests)
- `X-Business-Id` header used for tenant context on API requests (not path parameter) to avoid breaking existing URL structure
- Handler registry (`_handlers` dict in `voice_handler.py`) keyed by `business_id` — one `AIVoiceHandler` per tenant to isolate config
- `business_id` remains **optional** everywhere — `None` falls back to `business_config.json` for backward compat
- No new Python dependencies needed — `supabase>=2.3.0` already includes auth support

**Deferred to future phases:**
- `business_id` NOT NULL constraint on legacy tables — deferred until Phase G data migration assigns a business_id to all existing rows
- Phone number mapping update — demo business has `+placeholder_signalwire`; must be updated with real provider number when deploying

---

### Phase E: Scoped Chat & Voice Context ✅

Completed the remaining Phase E scope: business settings CRUD endpoints, frontend tenant-awareness, and cache invalidation on settings changes.

**Files modified:**
| File | Change |
|------|--------|
| `main.py` | Added 7 new endpoints under `/business/settings` and `/business/services` for full CRUD. All require JWT + business membership (admin/owner for writes). Added `UpdateBusinessRequest`, `CreateServiceRequest`, `UpdateServiceRequest` Pydantic models. |
| `script.js` | All `fetch()` calls now include `X-Business-Id` and `Authorization` headers via `apiHeaders()` helper. Added `currentBusinessId`/`authToken` state backed by localStorage. Added `setBusinessContext()`, `clearAuth()`, `apiHeaders()` helper functions. |

**New API endpoints:**
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/business/settings` | Member | Get full business row from Supabase |
| PATCH | `/business/settings` | Owner/Admin | Update business name, hours, greeting, contact, timezone |
| GET | `/business/services` | Member | List all services (including inactive) |
| POST | `/business/services` | Owner/Admin | Create a new service |
| PATCH | `/business/services/{id}` | Owner/Admin | Update service name, price, duration, description, is_active |
| DELETE | `/business/services/{id}` | Owner/Admin | Soft-delete (sets is_active=false) |

**Key design decisions:**
- All settings endpoints use `require_business_access` / `require_business_admin` FastAPI dependencies (JWT + X-Business-Id header required)
- Every write endpoint calls `invalidate_config_cache(business_id)` so voice handlers and chat pick up changes immediately
- Service deletion is soft-delete (`is_active=false`) to preserve referential integrity with existing appointments
- Frontend stores `businessId` and `authToken` in localStorage for persistence across page reloads
- `apiHeaders()` helper centralizes header construction — all fetch calls updated to use it

**Depends on:** Phase D ✅

---

### Phase F: Premium Frontend Redesign ✅

Replaced the vanilla JS frontend with a premium, animation-rich UI featuring dark/light theme, glassmorphism, SVG icons, and auth pages. Kept vanilla HTML/CSS/JS stack (no React) — FastAPI continues to serve files directly.

**Files rewritten:**
| File | Lines | Change |
|------|-------|--------|
| `style.css` | 2,256 | Full rewrite: dark/light theme via `[data-theme]` CSS custom properties, glassmorphism (backdrop-filter), 15+ keyframe animations, responsive breakpoints (1280/1024/768/480), toast system, skeleton loaders, waveform animation |
| `index.html` | 587 | Full rewrite: all emojis replaced with SVG icons (Lucide-style), auth page (sign-in/sign-up), theme toggle (sun/moon) in landing nav + sidebar, hero visual with gradient circle + pulsing rings, toast container |
| `script.js` | 898 | Full rewrite: theme system (localStorage-persisted), `showToast()` replacing all `alert()` calls, `animateCounter()` with ease-out cubic for dashboard stats, auth flow (`handleSignIn`/`handleSignUp` wired to `/auth/signin` and `/auth/signup`), IntersectionObserver for staggered feature card reveals |

**Key design decisions:**
- Stayed with vanilla HTML/CSS/JS instead of React+Vite — avoids build step complexity, FastAPI serves files directly, simpler deployment
- Dark theme is default; light theme fully supported with proper contrast (4.5:1 minimum)
- Auth page is embedded in the SPA (not a separate route) — toggled via JS, no backend changes needed
- All interactive elements have `cursor: pointer`, smooth hover transitions (150-300ms), and focus states
- `prefers-reduced-motion` media query respected — disables all animations for accessibility
- SVG icons used everywhere (no emoji icons) per UI/UX best practices
- Toast notifications replace browser `alert()` dialogs for a premium feel

**Depends on:** Phase E ✅

---

---

### Phase G: Data Migration Scripts ✅

Migrate existing SQLite data to Supabase.

**Files created:**
| File | Purpose |
|------|---------|
| `migrate_sqlite_to_supabase.py` | CLI migration script: reads `receptionist.db`, upserts all rows into Supabase scoped to a `business_id`. Idempotent (safe to re-run). |
| `supabase/migrations/015_business_id_not_null.sql` | Enforces `NOT NULL` on `business_id` for `callers`, `appointments`, `call_logs`. Aborts with a descriptive error if any NULL remains. Drops old partial unique index and replaces with a composite unique constraint. |

**Migration script usage:**
```bash
# Dry run (preview without writing)
python migrate_sqlite_to_supabase.py --dry-run

# Migrate to the first business in Supabase (demo business)
python migrate_sqlite_to_supabase.py

# Migrate to a specific business
python migrate_sqlite_to_supabase.py --business-id <uuid>

# Custom DB path
python migrate_sqlite_to_supabase.py --db /path/to/receptionist.db
```

**Post-migration steps:**
1. Run `python migrate_sqlite_to_supabase.py` — verify output shows matching row counts
2. Apply migration 015 via Supabase dashboard or `supabase db push`

**Depends on:** Phase D ✅

---

### Phase H: Observability, CORS Hardening & Production Polish ✅

Production hardening.

**Files created:**
| File | Purpose |
|------|---------|
| `logging_config.py` | `configure_logging()` sets up root logger (stdout, ISO timestamps). `get_logger(name)` used by all modules. `LOG_LEVEL` env var controls level (default INFO). `LOG_FORMAT=json` enables JSON output for log aggregators. |

**Files modified:**
| File | Change |
|------|--------|
| `main.py` | `configure_logging()` called at startup. All `print()` replaced with structured logger calls. CORS `allow_origins` now reads `ALLOWED_ORIGINS` env var (comma-separated); falls back to `"*"` when unset. `allow_methods`/`allow_headers` locked to required values. `slowapi` rate limiter added: `/auth/signup` 10/min, `/auth/signin` 20/min, `/chat` 60/min. Health check upgraded: verifies Supabase connectivity, AI provider key presence, voice provider credentials; returns HTTP 503 when degraded. |
| `database.py` | `print()` → `logger.error()` |
| `voice_handler.py` | `print()` → `logger.info/warning/error()` |
| `twilio_service.py` | `print()` → `logger.warning/error()` |
| `signalwire_service.py` | `print()` → `logger.warning/error()` |
| `receptionist.py` | `print()` → `logger.error()` |
| `requirements.txt` | Added `slowapi>=0.1.9` |

**New environment variables:**
| Variable | Default | Purpose |
|----------|---------|---------|
| `LOG_LEVEL` | `INFO` | Python log level (DEBUG/INFO/WARNING/ERROR) |
| `LOG_FORMAT` | `text` | `json` enables JSON log lines for Datadog/Cloudwatch |
| `ALLOWED_ORIGINS` | *(unset → `*`)* | Comma-separated list of allowed CORS origins for production |

**Depends on:** Phase F ✅

---

## Current Database State (as of Phase G completion)

- **10 tables** in public schema, all with RLS enabled
- **businesses:** 1 row (demo business)
- **services:** 3 rows (Consultation, Standard Service, Premium Service)
- **profiles:** 0 rows (placeholder removed; new profiles auto-created by auth trigger)
- **phone_number_mappings:** 1 row (demo business → +placeholder_signalwire)
- **All other tables:** 0 rows
- **Auth trigger:** `on_auth_user_created` on `auth.users` → `handle_new_user()` auto-creates profiles

## Environment Variables Required

```ini
# Supabase
SUPABASE_URL=https://umcqraqzjledqrxirqrl.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# AI Provider
AI_PROVIDER=groq          # groq | openai | huggingface | ollama
GROQ_API_KEY=<key>

# Voice Provider
VOICE_PROVIDER=signalwire  # signalwire | twilio
SIGNALWIRE_PROJECT_ID=<id>
SIGNALWIRE_API_TOKEN=<token>
SIGNALWIRE_SPACE_URL=<url>
SIGNALWIRE_PHONE_NUMBER=<number>

# Server
SERVER_URL=<your-ngrok-or-public-url>
PORT=8000

# Observability (Phase H)
LOG_LEVEL=INFO                  # DEBUG | INFO | WARNING | ERROR
LOG_FORMAT=text                 # text | json
ALLOWED_ORIGINS=https://your-frontend.onrender.com
```
