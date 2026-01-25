-- Enable pgcrypto for UUIDs and pgp_sym_encrypt/pgp_sym_decrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- App users (login + roles)
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  company text,
  role text NOT NULL DEFAULT 'user',
  account_number BIGSERIAL UNIQUE,
  password_hash text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  theme text NOT NULL DEFAULT 'light',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Account-level settings
CREATE TABLE IF NOT EXISTS account_settings (
  account_number bigint PRIMARY KEY,
  prompt text,
  sources text[] NOT NULL DEFAULT '{}',
  api_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Add account_number + encrypted content columns if missing
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS account_number bigint;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS account_number bigint;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_encrypted bytea;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source_client text;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS account_number bigint;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS source_client text;
ALTER TABLE account_settings ADD COLUMN IF NOT EXISTS api_key text;

-- Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number bigint NOT NULL,
  roblox_user_id bigint NOT NULL,
  recommendation text NOT NULL,
  source_type text NOT NULL,
  status text NOT NULL DEFAULT 'New',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'New';

-- Optional: backfill account_number for existing rows (replace with your default account number)
-- UPDATE conversations SET account_number = 100001 WHERE account_number IS NULL;
-- UPDATE messages SET account_number = 100001 WHERE account_number IS NULL;
-- UPDATE analytics SET account_number = 100001 WHERE account_number IS NULL;

-- Encrypt existing message content (replace with your MESSAGE_ENCRYPTION_KEY)
-- UPDATE messages
-- SET content_encrypted = pgp_sym_encrypt(content, 'REPLACE_WITH_MESSAGE_KEY')
-- WHERE content IS NOT NULL AND content_encrypted IS NULL;
-- UPDATE messages SET content = NULL WHERE content_encrypted IS NOT NULL;
