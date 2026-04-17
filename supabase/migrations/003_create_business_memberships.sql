-- 003_create_business_memberships.sql
-- Maps users (profiles) to businesses with a role.
-- CHECK constraint used instead of PG ENUM so new roles can be added without ALTER TYPE.

CREATE TABLE IF NOT EXISTS business_memberships (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
    business_id     UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    role            TEXT        NOT NULL DEFAULT 'staff'
                                CHECK (role IN ('owner', 'admin', 'staff')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT business_memberships_user_business_unique
        UNIQUE (user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_business_memberships_user_id
    ON business_memberships (user_id);

CREATE INDEX IF NOT EXISTS idx_business_memberships_business_id
    ON business_memberships (business_id);

COMMENT ON TABLE  business_memberships      IS 'User-to-business role assignments. One user can belong to multiple businesses.';
COMMENT ON COLUMN business_memberships.role IS 'owner | admin | staff. CHECK constraint (not PG ENUM) to allow easy future extension.';
