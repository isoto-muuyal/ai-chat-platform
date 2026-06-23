-- AI provider rate cards and infrastructure cost ledger for the admin cost calculator

CREATE TABLE IF NOT EXISTS ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  input_price_per_million numeric(10,4) NOT NULL,
  output_price_per_million numeric(10,4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS infrastructure_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  server_type text NOT NULL,
  monthly_cost_usd numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

INSERT INTO ai_providers (name, input_price_per_million, output_price_per_million)
VALUES
  ('Gemini Flash', 0.075, 0.30),
  ('ChatGPT (GPT-4o mini)', 0.15, 0.60)
ON CONFLICT (name) DO NOTHING;
