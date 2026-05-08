# Receptrix

Receptrix is a multi-tenant AI voice receptionist SaaS for clinics and service businesses. A clinic activates the $299.99/month medical clinic plan; a general business activates the $199.99/month plan. Each business provisions a Vapi-owned US phone number, configures its AI receptionist, and books appointments into Supabase-backed tenant data.

## Stack

- FastAPI backend
- Supabase Postgres
- React/Vite frontend
- Vapi for phone numbers, calls, AI voice, and tool calls
- Lemon Squeezy for billing

## Local Development

```bash
pip install -r requirements.txt
python main.py
```

```bash
cd frontend
npm install
npm run dev
```

## Required Environment

Copy `.env.example` to `.env` and set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `VAPI_API_KEY`
- `VAPI_PUBLIC_KEY`
- `VAPI_WEBHOOK_SECRET`
- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_MEDICAL_VARIANT_ID`
- `LEMONSQUEEZY_GENERAL_VARIANT_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `SERVER_URL`

For local demos only, `BYPASS_BILLING_FOR_DEMO=true` allows Vapi provisioning before a Lemon Squeezy webhook marks the subscription active.

For Render deployment and production checks, see [Render Deployment](docs/render-deployment.md).

## Demo Flow

1. Open the pricing page and choose the Medical Clinic plan.
2. Sign up with business type `medical_clinic`.
3. Start Lemon Squeezy checkout.
4. Let the Lemon Squeezy webhook mark the subscription active.
5. Open Dashboard -> AI Receptionist.
6. Configure greeting, tone, transfer number, emergency escalation, services, and hours.
7. Request a US area code and provision a Vapi number.
8. Start a test call to a verified phone number.
9. Ask the AI to schedule a fake-patient appointment.
10. Confirm the appointment appears in the dashboard.

## HIPAA Notes

Receptrix configures medical clinic assistants with Vapi HIPAA mode enabled and disables Vapi recordings, transcripts, and call logs. Do not use real patient PHI until BAAs are in place with Vapi, Supabase, and the hosting provider. Do not send PHI to Lemon Squeezy.
