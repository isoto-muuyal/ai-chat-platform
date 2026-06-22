-- Pay-as-you-go credits, CMS content, contact form, and PayPal admin settings

CREATE TABLE IF NOT EXISTS credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price_usd numeric(10,2) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_credits (
  account_number bigint PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number bigint NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'usage', 'adjustment')),
  credits integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  provider text,
  provider_reference text,
  price_usd numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_account
  ON credit_transactions(account_number, created_at DESC);

CREATE TABLE IF NOT EXISTS cms_pages (
  slug text PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  updated_by uuid REFERENCES app_users(id)
);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paypal_settings (
  id text PRIMARY KEY DEFAULT 'default',
  environment text NOT NULL DEFAULT 'sandbox',
  client_id text,
  client_secret_encrypted bytea,
  webhook_id text,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Seed starter credit packages
INSERT INTO credit_packages (name, credits, price_usd, active, sort_order)
VALUES
  ('Starter', 100, 5.00, true, 1),
  ('Growth', 500, 20.00, true, 2),
  ('Pro', 2000, 70.00, true, 3)
ON CONFLICT DO NOTHING;

-- Seed CMS content
INSERT INTO cms_pages (slug, title, content)
VALUES
  (
    'about-us',
    'About Us',
    '<p>Launch branded AI assistants for different customers, connect them to common messaging channels, and manage the knowledge, usage, and reporting behind every conversation.</p><h2>Built for service teams and agencies</h2><ul><li><strong>Multi-client setup</strong> &mdash; Separate accounts, source configuration, model destinations, and reporting keep each customer isolated.</li><li><strong>Channel coverage</strong> &mdash; Connect web chat, WhatsApp, SMS, and direct API integrations from one management surface.</li><li><strong>Context control</strong> &mdash; Upload customer context so each agent can answer with the right tone, policies, and business details.</li></ul>'
  ),
  (
    'how-it-works',
    'How It Works',
    '<p>Getting started takes three steps:</p><ol><li><strong>Create your account</strong> and configure a chat source for your website, WhatsApp, or SMS number.</li><li><strong>Add context</strong> describing your business so the assistant answers with the right tone and policies.</li><li><strong>Buy credits</strong> and start chatting &mdash; each message your customers send uses one credit, and you can top up any time from Your Account.</li></ol>'
  ),
  (
    'privacy-statement',
    'Privacy Statement',
    '<p>We collect the information needed to operate your chat assistants, including conversation content, account configuration, and usage statistics.</p><p>Data is used solely to provide and improve the service, and is not sold to third parties. Conversation content is encrypted at rest. You may request deletion of your account data at any time by contacting us.</p>'
  )
ON CONFLICT (slug) DO NOTHING;
