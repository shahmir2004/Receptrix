# Render Deployment

Receptrix deploys as one Render web service from `render.yaml`. The service builds the FastAPI backend and the React/Vite dashboard, then serves both from `uvicorn`.

## Git Flow

Push production-ready work to `main`:

```powershell
git checkout main
git pull origin main
git merge client-ready-vapi-demo
git push origin main
```

Render should be connected to the GitHub repository with auto-deploys enabled for the `main` branch.

## Required Render Environment

Set these in Render before deploying or before the first health check runs:

```env
REQUIRE_PROD_READY=true
SERVER_URL=https://<your-render-service>.onrender.com
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<supabase service role key>
AI_PROVIDER=groq
GROQ_API_KEY=<groq api key>
VAPI_API_KEY=<vapi private api key>
VAPI_PUBLIC_KEY=<vapi public web key>
VAPI_BASE_URL=https://api.vapi.ai
VAPI_WEBHOOK_SECRET=<long random secret>
VAPI_MODEL_PROVIDER=openai
VAPI_MODEL=gpt-4o-mini
VAPI_MAX_CALL_SECONDS=600
VAPI_DEMO_BUSINESS_ID=<business id for the public landing demo>
VAPI_DEMO_ASSISTANT_ID=<optional vapi assistant id for the public demo>
VAPI_DEMO_PHONE_NUMBER_ID=<optional vapi phone number id for the public demo>
BYPASS_BILLING_FOR_DEMO=false
LEMONSQUEEZY_API_KEY=<lemon squeezy api key>
LEMONSQUEEZY_STORE_ID=<lemon squeezy store id>
LEMONSQUEEZY_MEDICAL_VARIANT_ID=<medical clinic monthly variant id>
LEMONSQUEEZY_GENERAL_VARIANT_ID=<general business monthly variant id>
LEMONSQUEEZY_WEBHOOK_SECRET=<long random secret>
LEMONSQUEEZY_TEST_MODE=true
LEMONSQUEEZY_SUCCESS_URL=https://<your-render-service>.onrender.com/dashboard
LEMONSQUEEZY_CANCEL_URL=https://<your-render-service>.onrender.com/#pricing
ALLOWED_ORIGINS=https://<your-render-service>.onrender.com
ALLOWED_HOSTS=<your-render-service>.onrender.com
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
DEFAULT_BUSINESS_TIMEZONE=America/New_York
BUSINESS_NAME=Receptrix
```

Use `LEMONSQUEEZY_TEST_MODE=true` for deployed checkout testing with no real charge. For real paid production, switch it to `false` and use live Lemon Squeezy store, product, variant, API key, and webhook secret values.

## Webhooks

Configure provider webhooks against the deployed backend:

```text
Lemon Squeezy: https://<your-render-service>.onrender.com/webhooks/lemonsqueezy
Vapi: created by Receptrix during voice provisioning from SERVER_URL + /webhooks/vapi
```

The Lemon Squeezy webhook signing secret must exactly match `LEMONSQUEEZY_WEBHOOK_SECRET`. The Vapi webhook shared secret must exactly match `VAPI_WEBHOOK_SECRET`.

## Landing Page Web Demo

The public Live Demo button calls `GET /demo/web-call-config`, then starts a browser audio session with `@vapi-ai/web`. It never exposes the Vapi private API key to the browser. The browser receives only `VAPI_PUBLIC_KEY` and the configured demo assistant id.

Set `VAPI_PUBLIC_KEY` and `VAPI_DEMO_ASSISTANT_ID` in Render for the in-browser demo. `VAPI_DEMO_PHONE_NUMBER_ID` is only needed for the optional outbound phone-call endpoint. If the assistant id is blank, the backend falls back to the provisioned `vapi_phone_numbers` row for `VAPI_DEMO_BUSINESS_ID` (default demo seed: `00000000-0000-0000-0000-000000000001`).

## Production Cutover Checklist

- Keep `BYPASS_BILLING_FOR_DEMO=false`.
- Use the Vapi private API key only on Render, never in the frontend.
- Configure `VAPI_PUBLIC_KEY` and the landing demo Vapi assistant id, or provision the demo business voice line before sending prospects to the Live Demo section.
- Set exact `ALLOWED_ORIGINS` and `ALLOWED_HOSTS`.
- Keep `COOKIE_SECURE=true`.
- Run `/health` after deploy and confirm status is `healthy`.
- Confirm `/pricing/plans` returns the `$299.99/month` medical clinic plan and `$199.99/month` general business plan.
- Complete signup as `medical_clinic`.
- Complete Lemon Squeezy checkout in test mode first.
- Provision a Vapi number from the dashboard.
- Run a fake-patient test call and confirm an appointment row appears.
- Before handling real PHI, execute BAAs with Vapi, Supabase, and Render or the final hosting provider.
