import { pool } from '../../config/db.js';
import { env } from '../../config/env.js';

export type DestinationProvider = 'gemini' | 'openai';
export type SourceType = 'roblox' | 'whatsapp' | 'web_app';
export type SourceProvider = 'api' | 'twilio_whatsapp';

export type ResolvedSourceConfig = {
  accountApiKey: string | null;
  sourceName: string | null;
  sourceType: SourceType | null;
  sourceProvider: SourceProvider | 'legacy';
  prompt: string | null;
  providerIdentifier: string | null;
  providerSecret: string | null;
  destination: {
    name: string;
    provider: DestinationProvider;
    model: string;
    apiKey: string;
  };
};

type LegacyAccountSettings = {
  prompt: string | null;
  sources: string[];
  apiKey: string | null;
};

const getLegacyAccountSettings = async (accountNumber: number): Promise<LegacyAccountSettings> => {
  const result = await pool.query(
    `SELECT prompt, sources, api_key
     FROM account_settings
     WHERE account_number = $1`,
    [accountNumber]
  );

  if (result.rows.length === 0) {
    return { prompt: null, sources: [], apiKey: null };
  }

  const row = result.rows[0];
  return {
    prompt: typeof row.prompt === 'string' ? row.prompt : null,
    sources: Array.isArray(row.sources) ? row.sources.filter((value: unknown): value is string => typeof value === 'string') : [],
    apiKey: typeof row.api_key === 'string' ? row.api_key : null,
  };
};

const getConfiguredSource = async (
  accountNumber: number,
  requestedSourceName?: string
) => {
  const params: unknown[] = [accountNumber, env.MESSAGE_ENCRYPTION_KEY];
  let query = `SELECT
      s.name,
      s.source_type,
      s.provider,
      s.prompt,
      s.provider_identifier,
      COALESCE(pgp_sym_decrypt(s.provider_secret_encrypted, $2)::text, '') as provider_secret,
      d.name as destination_name,
      d.provider as destination_provider,
      d.model as destination_model,
      COALESCE(pgp_sym_decrypt(d.api_key_encrypted, $2)::text, '') as destination_api_key
    FROM account_sources s
    JOIN account_destinations d ON d.id = s.destination_id
    WHERE s.account_number = $1`;

  if (requestedSourceName) {
    params.push(requestedSourceName);
    query += ` AND s.name = $3`;
  } else {
    query += ` ORDER BY s.created_at ASC LIMIT 1`;
  }

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

export const resolveSourceConfig = async (
  accountNumber: number,
  requestedSourceName?: string
): Promise<ResolvedSourceConfig> => {
  const legacy = await getLegacyAccountSettings(accountNumber);
  const configured = await getConfiguredSource(accountNumber, requestedSourceName);

  if (configured) {
    return {
      accountApiKey: legacy.apiKey,
      sourceName: configured.name,
      sourceType: configured.source_type,
      sourceProvider: configured.provider,
      prompt: configured.prompt || null,
      providerIdentifier: configured.provider_identifier || null,
      providerSecret: configured.provider_secret || null,
      destination: {
        name: configured.destination_name,
        provider: configured.destination_provider,
        model: configured.destination_model,
        apiKey: configured.destination_api_key,
      },
    };
  }

  const normalizedLegacySources = legacy.sources.map((value) => value.trim()).filter(Boolean);
  if (requestedSourceName && normalizedLegacySources.length > 0 && !normalizedLegacySources.includes(requestedSourceName)) {
    throw new Error('Invalid sourceClient');
  }

  return {
    accountApiKey: legacy.apiKey,
    sourceName: requestedSourceName || normalizedLegacySources[0] || null,
    sourceType: null,
    sourceProvider: 'legacy',
    prompt: legacy.prompt,
    providerIdentifier: null,
    providerSecret: null,
    destination: {
      name: 'legacy-gemini',
      provider: 'gemini',
      model: env.GEMINI_MODEL,
      apiKey: env.GEMINI_KEY,
    },
  };
};

export const listAccountSources = async (accountNumber: number): Promise<string[]> => {
  const configuredResult = await pool.query(
    `SELECT name
     FROM account_sources
     WHERE account_number = $1
     ORDER BY created_at ASC`,
    [accountNumber]
  );

  if (configuredResult.rows.length > 0) {
    return configuredResult.rows.map((row) => row.name);
  }

  const legacy = await getLegacyAccountSettings(accountNumber);
  return legacy.sources.map((value) => value.trim()).filter(Boolean);
};

export const resolveTwilioWhatsAppSource = async (providerIdentifier: string) => {
  const result = await pool.query(
    `SELECT
      s.account_number,
      s.name,
      s.source_type,
      s.provider,
      s.prompt,
      s.provider_identifier,
      COALESCE(pgp_sym_decrypt(s.provider_secret_encrypted, $2)::text, '') as provider_secret,
      d.name as destination_name,
      d.provider as destination_provider,
      d.model as destination_model,
      COALESCE(pgp_sym_decrypt(d.api_key_encrypted, $2)::text, '') as destination_api_key,
      a.api_key as account_api_key
     FROM account_sources s
     JOIN account_destinations d ON d.id = s.destination_id
     JOIN account_settings a ON a.account_number = s.account_number
     WHERE s.source_type = 'whatsapp'
       AND s.provider = 'twilio_whatsapp'
       AND s.provider_identifier = $1
     LIMIT 1`,
    [providerIdentifier, env.MESSAGE_ENCRYPTION_KEY]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    accountNumber: row.account_number as number,
    config: {
      accountApiKey: row.account_api_key as string | null,
      sourceName: row.name as string,
      sourceType: row.source_type as SourceType,
      sourceProvider: row.provider as SourceProvider,
      prompt: (row.prompt as string | null) || null,
      providerIdentifier: (row.provider_identifier as string | null) || null,
      providerSecret: (row.provider_secret as string | null) || null,
      destination: {
        name: row.destination_name as string,
        provider: row.destination_provider as DestinationProvider,
        model: row.destination_model as string,
        apiKey: row.destination_api_key as string,
      },
    } satisfies ResolvedSourceConfig,
  };
};
