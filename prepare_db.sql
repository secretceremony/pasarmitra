-- Setup script for local Postgres to mimic Supabase
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

-- Create auth.uid() helper
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT null::uuid;
$$ LANGUAGE sql STABLE;

-- Create auth.role() helper
CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
  SELECT 'authenticated';
$$ LANGUAGE sql STABLE;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    encrypted_password TEXT,
    email_confirmed_at TIMESTAMPTZ,
    invited_at TIMESTAMPTZ,
    confirmation_token TEXT,
    confirmation_sent_at TIMESTAMPTZ,
    recovery_token TEXT,
    recovery_sent_at TIMESTAMPTZ,
    email_change_token_new TEXT,
    email_change TEXT,
    email_change_sent_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    raw_app_meta_data JSONB,
    raw_user_meta_data JSONB,
    is_super_admin BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    phone TEXT UNIQUE DEFAULT NULL,
    phone_confirmed_at TIMESTAMPTZ,
    phone_change TEXT DEFAULT '',
    phone_change_token TEXT DEFAULT '',
    phone_change_sent_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    email_change_token_current TEXT DEFAULT '',
    email_change_confirm_status SMALLINT DEFAULT 0,
    banned_until TIMESTAMPTZ,
    reauthentication_token TEXT DEFAULT '',
    reauthentication_sent_at TIMESTAMPTZ,
    is_sso_user BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);
