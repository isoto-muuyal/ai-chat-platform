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
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS account_number bigint;

-- Optional: backfill account_number for existing rows (replace with your default account number)
-- UPDATE conversations SET account_number = 100001 WHERE account_number IS NULL;
-- UPDATE messages SET account_number = 100001 WHERE account_number IS NULL;
-- UPDATE analytics SET account_number = 100001 WHERE account_number IS NULL;

-- Encrypt existing message content (replace with your MESSAGE_ENCRYPTION_KEY)
-- UPDATE messages
-- SET content_encrypted = pgp_sym_encrypt(content, 'REPLACE_WITH_MESSAGE_KEY')
-- WHERE content IS NOT NULL AND content_encrypted IS NULL;
-- UPDATE messages SET content = NULL WHERE content_encrypted IS NOT NULL;
