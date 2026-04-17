# Receptrix Frontend: Current State Context (April 2026)

## Purpose
This document captures the current frontend implementation so another agent can redesign/revamp it with full context and without guessing behavior.

## Tech and Delivery
- Frontend stack: plain HTML + CSS + vanilla JavaScript.
- No bundler/framework/component system.
- Served as static assets by FastAPI.
- Cache-busted asset includes in HTML:
  - `style.css?v=6`
  - `script.js?v=6`
- Google Font loaded: Inter.

## Frontend Files Reviewed
- `index.html`
- `style.css`
- `script.js`

## High-Level App Structure
Single-page app with three top-level views toggled by `.hidden` class:
1. `#landing` (marketing landing page)
2. `#auth-page` (sign in / sign up)
3. `.app-container` (main dashboard app)

The app does not use routing; view state is controlled entirely in JS.

## View and Feature Inventory

### 1) Landing Page (`#landing`)
- Fixed top nav with logo, theme toggle, Sign In, Dashboard CTA.
- Hero with headline, subheadline, CTAs, animated phone/ripple visual.
- Features grid (4 cards): AI conversations, scheduling, voice handling, analytics.
- CTA section and footer.

### 2) Auth Page (`#auth-page`)
- Sign in form:
  - email, password
  - submit -> `handleSignIn(event)`
- Sign up form:
  - full name, business name, email, password
  - submit -> `handleSignUp(event)`
- Client-side password rule for signup: min 8 chars + uppercase + lowercase + number.
- Toggle between forms with `showAuthForm('signin'|'signup')`.

### 3) Dashboard App (`.app-container`)
Sidebar tabs:
- Dashboard
- Appointments
- Call Logs
- Voice Test
- Settings

#### Dashboard tab
- Stats cards:
  - total appointments
  - today's appointments
  - total calls
  - completed calls
- "Today's Schedule" list
- "Recent Calls" list
- Setup banner shown if user has no active business context.

#### Appointments tab
- Date and status filters (currently only trigger reload, no client-side filter composition).
- Table columns: date, time, name, phone, service, status, actions.
- Actions: confirm/cancel status updates.
- New appointment modal with service/date/time availability flow.

#### Call Logs tab
- Table columns: datetime, caller, duration, status, appointment created, transcript action.
- Transcript modal for stored transcript text.

#### Voice Test tab
- Voice mode toggle.
- Simulated call controls (start/end call, duration timer).
- Chat area (user and AI messages).
- Input + mic button.
- Browser SpeechRecognition + SpeechSynthesis integration.

#### Settings tab
- Account profile form.
- Change password form.
- Business information form.
- Working hours form.
- Services editor (dynamic rows with create/update/delete behavior).
- Voice provider setup instructional card.

## Frontend State Management (`script.js`)
Global mutable state:
- `conversationHistory`
- `services`
- `config`
- `currentBusinessId` (also in localStorage)
- `currentUser`
- `businessMemberships`
- `isAuthenticated`

Auth/session patterns:
- `initializeSession()` calls `/auth/me` on load.
- Session uses cookie credentials (`credentials: 'include'`).
- CSRF token read from `rx_csrf_token` cookie and sent as `X-CSRF-Token`.
- Active business context sent as `X-Business-Id`.
- Central unauthorized handling:
  - 401 -> clear auth state, show auth page, toast "Session expired..."

Theme system:
- Theme persisted in localStorage key `theme`.
- Applies `data-theme="dark|light"` on `<html>`.
- Updates meta `theme-color` accordingly.
- Updates icon visibility for both landing and sidebar toggles.

## API Endpoints Consumed by Frontend

### Auth/session
- `POST /auth/signin`
- `POST /auth/signup`
- `GET /auth/me`
- `POST /auth/logout`
- `PATCH /auth/profile`
- `PATCH /auth/password`
- `POST /auth/business`

### Dashboard + data
- `GET /stats`
- `GET /appointments`
- `GET /appointments?date=...`
- `POST /appointments`
- `PATCH /appointments/{id}/status?status=...`
- `GET /appointments/availability?date=...&service=...`
- `GET /calls`
- `GET /calls?limit=5`
- `POST /chat`

### Settings/business/services
- `GET /business/settings`
- `PATCH /business/settings`
- `GET /business/services`
- `POST /business/services`
- `PATCH /business/services/{id}`
- `DELETE /business/services/{id}`

Legacy/parallel endpoint usage still present:
- `GET /services` used by appointment modal loader.

## Interaction and Behavior Details
- Dashboard access requires authentication.
- Some tabs are restricted without active business context:
  - appointments
  - calls
  - chat
- If no business context:
  - forced to settings flow
  - setup banner shown
  - lists and counters reset / instructional empty states displayed
- Counter animations use `requestAnimationFrame` easing.
- Landing feature cards animate in via IntersectionObserver.
- Toast system supports success/error/info with auto-dismiss.

## CSS and Visual System (`style.css`)
- Token-heavy CSS custom properties.
- Two themes via `[data-theme="dark"]` and `[data-theme="light"]`.
- Primary visual style: glassmorphism + gradients + subtle neon glow.
- Animation set includes:
  - fade/slide variants
  - ripple and pulse
  - gradient shift
  - breathe and waveform
- Responsive behavior is implemented via media queries (mobile/tablet patterns present).

Notable style direction today:
- Purple/indigo accent dominant (`--primary`, `--secondary`, `--accent`).
- Inter font stack throughout.
- Card-heavy dashboard with translucent surfaces and blur.

## Known Quirks / Redesign-Relevant Constraints
1. Monolithic files:
- `index.html`, `style.css`, and `script.js` are large and handle all concerns in one layer.

2. Tight coupling to element IDs/classes:
- JS relies on many hard-coded selectors and inline `onclick` handlers in HTML.

3. No SPA router/state library:
- View transitions are manual class toggles.

4. Endpoint inconsistency:
- Both `/services` and `/business/services` are used in different flows.

5. Some logic is sequential and repetitive:
- Multiple sections fetch then manually parse payloads with similar patterns.

6. Voice features are browser-capability dependent:
- SpeechRecognition availability check gates microphone behavior.

7. Locale assumptions in formatting:
- Dates/times use `en-PK` formatting.
- Phone formatting helper assumes `+92` pattern.

## DOM Anchors and IDs Most Used by JS
Representative critical IDs:
- App containers: `landing`, `auth-page`, `.app-container`
- Auth forms: `signin-form`, `signup-form`
- User status: `user-status-name`, `user-status-email`, `user-status-business`
- Dashboard stats: `total-appointments`, `today-appointments`, `total-calls`, `completed-calls`
- Lists/tables: `todays-schedule`, `recent-calls`, `appointments-table`, `calls-table`
- Modals: `appointment-modal`, `transcript-modal`
- Voice/chat: `chat-container`, `message-input`, `send-button`, `mic-button`, `voice-status`
- Settings: profile/password/business/working-hours/service editor form controls

## Redesign Safety Checklist (for next agent)
If revamping UI while preserving behavior, keep these stable unless backend/frontend logic is refactored too:
- Keep required IDs/classes used in `script.js`, or update JS selectors everywhere.
- Preserve auth/session/business context flow.
- Preserve all endpoint calls or migrate consistently.
- Preserve modal behaviors for appointment creation and transcript viewing.
- Preserve voice/chat control flows if voice test remains a feature.

## Suggested Refactor Order for the Next Agent
1. Split JS into modules:
- auth/session
- api client
- dashboard data
- appointments
- calls
- chat/voice
- settings
- ui utilities (toast/theme/modals)

2. Replace inline handlers with delegated event listeners.

3. Introduce a UI component structure (even if still vanilla) before visual overhaul.

4. Normalize endpoint usage (`/business/services` vs `/services`) and centralize API wrappers.

5. Redesign visual system and responsive layout after behavior parity is locked.

## Current Snapshot Summary
The frontend is a functional, feature-rich, single-page dashboard/landing/auth experience implemented in plain HTML/CSS/JS. It already supports multi-tenant business context, auth-protected workflows, appointment/call management, and voice testing. The main redesign challenge is not missing features; it is maintainability and structure while preserving existing backend contracts and behaviors.
