# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## What Receptrix Is

Receptrix is a multi-tenant AI voice receptionist SaaS for US medical clinics. Each clinic signs up, selects a healthcare business type, activates the $300/month Lemon Squeezy plan, provisions a Vapi-owned US phone number, configures its AI receptionist, and books appointments into Supabase-scoped clinic data.

## Development Commands

```bash
pip install -r requirements.txt
python main.py
uvicorn main:app --host 0.0.0.0 --port 8000

cd frontend
npm install
npm run dev
npm run build
```

## Architecture

Primary stack: FastAPI, Supabase Postgres, React/Vite, Lemon Squeezy billing, and Vapi voice.

Vapi call flow:

```text
PSTN call -> Vapi phone number
  -> Vapi assistant configured by /business/voice/provision
  -> POST /webhooks/vapi
  -> tool-calls resolved by Vapi phone number or assistant id
  -> vapi_agent.py reads clinic settings/services/hours live
  -> database.py writes callers, appointments, call logs, and audit events by business_id
```

Key modules:

- `main.py` - FastAPI app, auth, billing, Vapi provisioning, Vapi webhook, dashboard APIs.
- `billing.py` - Lemon Squeezy checkout, webhook signature verification, subscription state.
- `vapi_client.py` - Vapi REST client wrapper.
- `vapi_agent.py` - Vapi assistant payloads and tool-call handlers.
- `tenant.py` - Business config cache and Vapi/phone tenant resolution.
- `database.py` - Supabase operations for callers, calls, appointments, availability, and audit events.
- `auth.py` - Supabase auth, secure cookies, CSRF, business membership checks.
- `frontend/` - React/Vite dashboard and landing page.

## Production Rules

- Vapi is the only voice, AI call, and phone-number provider.
- Do not reintroduce alternate telephony providers.
- Medical clinic assistants must use `compliancePlan.hipaaEnabled=true`.
- Do not store Vapi recordings, transcripts, or PHI-bearing call artifacts.
- Do not send PHI to Lemon Squeezy.
- Use `business_id` for every tenant-scoped query and write.
- Voice provisioning and test-call endpoints require owner/admin access.
- Webhooks must verify `LEMONSQUEEZY_WEBHOOK_SECRET` or `VAPI_WEBHOOK_SECRET`.
- Production deploys need exact `ALLOWED_ORIGINS`, `ALLOWED_HOSTS`, `COOKIE_SECURE=true`, and BAAs with Vapi, Supabase, and the hosting provider before real PHI.

## Configuration

Required backend env vars:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `VAPI_API_KEY`
- `VAPI_WEBHOOK_SECRET`
- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_MEDICAL_VARIANT_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `SERVER_URL`

Development-only:

- `BYPASS_BILLING_FOR_DEMO=true` allows Vapi provisioning before a Lemon Squeezy webhook marks the subscription active. Keep it false in production.

## Codebase Search

A graphify knowledge graph exists at `graphify-out/`.

Rules:

- Before architecture or codebase answers, read `graphify-out/GRAPH_REPORT.md`.
- If `graphify-out/wiki/index.md` exists, use the wiki before raw files.
- After modifying code files, run `graphify update .` when the graphify CLI is available.
