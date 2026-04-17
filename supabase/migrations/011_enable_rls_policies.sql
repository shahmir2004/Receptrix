-- 011_enable_rls_policies.sql
-- Phase B: Enable RLS and row-level access policies on all tenant-scoped tables.
--
-- Auth model:
--   auth.uid()  →  profiles.id  →  business_memberships.user_id
--   Service-role key (Python backend) bypasses RLS entirely — no backend changes needed.
--
-- Helper functions use SECURITY DEFINER to prevent infinite recursion when
-- policies on other tables query business_memberships.

-- ── Helper functions ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth_is_member_of(p_business_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_memberships
        WHERE business_id = p_business_id
          AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION auth_is_owner_or_admin(p_business_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_memberships
        WHERE business_id = p_business_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION auth_is_owner(p_business_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_memberships
        WHERE business_id = p_business_id
          AND user_id = auth.uid()
          AND role = 'owner'
    );
$$;

-- ── Enable RLS on all tables ─────────────────────────────────────────────────

ALTER TABLE businesses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE services             ENABLE ROW LEVEL SECURITY;
ALTER TABLE callers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_states  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings             ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Users can only access their own profile row.

CREATE POLICY "profiles: own row select"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "profiles: own row insert"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: own row update"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- ── businesses ────────────────────────────────────────────────────────────────
-- Any member can read. Owners/admins can update. INSERT/DELETE via service role only.

CREATE POLICY "businesses: members select"
    ON businesses FOR SELECT
    USING (auth_is_member_of(id));

CREATE POLICY "businesses: owner/admin update"
    ON businesses FOR UPDATE
    USING (auth_is_owner_or_admin(id));

-- ── business_memberships ──────────────────────────────────────────────────────
-- Users can read their own membership row.
-- Owners can read all memberships in their business and manage (insert/update/delete) them.
-- The helper functions use SECURITY DEFINER, so no recursive RLS evaluation.

CREATE POLICY "memberships: own row select"
    ON business_memberships FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "memberships: owners manage"
    ON business_memberships FOR ALL
    USING (auth_is_owner(business_id))
    WITH CHECK (auth_is_owner(business_id));

-- ── services ──────────────────────────────────────────────────────────────────
-- Members can read. Owners/admins can create, update, and delete.

CREATE POLICY "services: members select"
    ON services FOR SELECT
    USING (auth_is_member_of(business_id));

CREATE POLICY "services: owner/admin manage"
    ON services FOR ALL
    USING (auth_is_owner_or_admin(business_id))
    WITH CHECK (auth_is_owner_or_admin(business_id));

-- ── callers ───────────────────────────────────────────────────────────────────
-- business_id nullable during Phase A/B (backend creates rows without it).
-- Null rows visible to all authenticated users until Phase C backfills.

CREATE POLICY "callers: members select"
    ON callers FOR SELECT
    USING (business_id IS NULL OR auth_is_member_of(business_id));

CREATE POLICY "callers: members insert"
    ON callers FOR INSERT
    WITH CHECK (business_id IS NULL OR auth_is_member_of(business_id));

CREATE POLICY "callers: members update"
    ON callers FOR UPDATE
    USING (business_id IS NULL OR auth_is_member_of(business_id));

CREATE POLICY "callers: owner/admin delete"
    ON callers FOR DELETE
    USING (auth_is_owner_or_admin(business_id));

-- ── appointments ──────────────────────────────────────────────────────────────

CREATE POLICY "appointments: members select"
    ON appointments FOR SELECT
    USING (business_id IS NULL OR auth_is_member_of(business_id));

CREATE POLICY "appointments: members insert"
    ON appointments FOR INSERT
    WITH CHECK (business_id IS NULL OR auth_is_member_of(business_id));

CREATE POLICY "appointments: members update"
    ON appointments FOR UPDATE
    USING (business_id IS NULL OR auth_is_member_of(business_id));

CREATE POLICY "appointments: owner/admin delete"
    ON appointments FOR DELETE
    USING (auth_is_owner_or_admin(business_id));

-- ── call_logs ─────────────────────────────────────────────────────────────────
-- INSERT handled exclusively by backend (service role). No user INSERT policy needed.

CREATE POLICY "call_logs: members select"
    ON call_logs FOR SELECT
    USING (business_id IS NULL OR auth_is_member_of(business_id));

CREATE POLICY "call_logs: owner/admin update"
    ON call_logs FOR UPDATE
    USING (auth_is_owner_or_admin(business_id));

-- ── conversation_states and bookings ─────────────────────────────────────────
-- Backend-only tables accessed exclusively via the service-role key.
-- Service role bypasses RLS; no user-facing policies → default-deny for JWT/anon.
-- (intentionally no CREATE POLICY statements for these tables)
