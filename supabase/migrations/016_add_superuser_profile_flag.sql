-- 016_add_superuser_profile_flag.sql
-- Adds is_superuser to profiles. Vapi now provisions phone numbers directly,
-- so Receptrix no longer maintains a provider DID pool.

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN profiles.is_superuser IS 'Platform-level superuser flag. Set manually by the Receptrix team.';
