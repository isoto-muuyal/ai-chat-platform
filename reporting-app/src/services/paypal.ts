import { env } from '../config/env.js';
import { pool } from '../config/db.js';

type PayPalCredentials = {
  environment: 'sandbox' | 'live';
  clientId: string;
  clientSecret: string;
  webhookId: string | null;
};

let cachedCredentials: PayPalCredentials | null = null;
let cachedAt = 0;
const CREDENTIALS_CACHE_MS = 60_000;

const getCredentials = async (): Promise<PayPalCredentials> => {
  if (cachedCredentials && Date.now() - cachedAt < CREDENTIALS_CACHE_MS) {
    return cachedCredentials;
  }

  const result = await pool.query(
    `SELECT environment, client_id, webhook_id,
       pgp_sym_decrypt(client_secret_encrypted, $1)::text as client_secret
     FROM paypal_settings WHERE id = 'default'`,
    [env.MESSAGE_ENCRYPTION_KEY]
  );
  const row = result.rows[0];

  const credentials: PayPalCredentials = {
    environment: (row?.environment as 'sandbox' | 'live') || env.PAYPAL_ENVIRONMENT,
    clientId: row?.client_id || env.PAYPAL_CLIENT_ID || '',
    clientSecret: row?.client_secret || env.PAYPAL_CLIENT_SECRET || '',
    webhookId: row?.webhook_id || env.PAYPAL_WEBHOOK_ID || null,
  };

  if (!credentials.clientId || !credentials.clientSecret) {
    throw new Error('PayPal is not configured');
  }

  cachedCredentials = credentials;
  cachedAt = Date.now();
  return credentials;
};

const getBaseUrl = (environment: 'sandbox' | 'live'): string =>
  environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

export const getPayPalAccessToken = async (): Promise<{ accessToken: string; environment: 'sandbox' | 'live' }> => {
  const credentials = await getCredentials();
  const basicAuth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
  const response = await fetch(`${getBaseUrl(credentials.environment)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`PayPal auth failed with ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('PayPal auth response missing access token');
  }
  return { accessToken: data.access_token, environment: credentials.environment };
};

export const createPayPalSubscription = async (params: {
  accountNumber: number;
  email: string;
}): Promise<{ id: string; approveUrl: string | null; status: string }> => {
  const { accessToken, environment } = await getPayPalAccessToken();
  const response = await fetch(`${getBaseUrl(environment)}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      plan_id: env.PAYPAL_PRO_PLAN_ID,
      custom_id: String(params.accountNumber),
      subscriber: {
        email_address: params.email,
      },
      application_context: {
        brand_name: 'AI Chat Platform',
        user_action: 'SUBSCRIBE_NOW',
        return_url: env.PAYPAL_RETURN_URL || `${env.APP_BASE_URL.replace(/\/$/, '')}/settings`,
        cancel_url: env.PAYPAL_CANCEL_URL || `${env.APP_BASE_URL.replace(/\/$/, '')}/signup`,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`PayPal subscription failed with ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    id?: string;
    status?: string;
    links?: Array<{ href: string; rel: string }>;
  };
  if (!data.id) {
    throw new Error('PayPal subscription response missing id');
  }
  return {
    id: data.id,
    approveUrl: data.links?.find((link) => link.rel === 'approve')?.href || null,
    status: data.status || 'APPROVAL_PENDING',
  };
};

export const createPayPalOrder = async (params: {
  accountNumber: number;
  packageId: string;
  amountUsd: number;
}): Promise<{ id: string; approveUrl: string | null; status: string }> => {
  const { accessToken, environment } = await getPayPalAccessToken();
  const response = await fetch(`${getBaseUrl(environment)}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: `${params.accountNumber}:${params.packageId}`,
          amount: {
            currency_code: 'USD',
            value: params.amountUsd.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'AI Chat Platform',
        user_action: 'PAY_NOW',
        return_url: `${env.APP_BASE_URL.replace(/\/$/, '')}/account`,
        cancel_url: `${env.APP_BASE_URL.replace(/\/$/, '')}/account`,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`PayPal order failed with ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    id?: string;
    status?: string;
    links?: Array<{ href: string; rel: string }>;
  };
  if (!data.id) {
    throw new Error('PayPal order response missing id');
  }
  return {
    id: data.id,
    approveUrl: data.links?.find((link) => link.rel === 'approve')?.href || null,
    status: data.status || 'CREATED',
  };
};

export const capturePayPalOrder = async (
  orderId: string
): Promise<{ status: string; customId: string | null }> => {
  const { accessToken, environment } = await getPayPalAccessToken();
  const response = await fetch(`${getBaseUrl(environment)}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`PayPal capture failed with ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    status?: string;
    purchase_units?: Array<{ custom_id?: string }>;
  };
  return {
    status: data.status || 'UNKNOWN',
    customId: data.purchase_units?.[0]?.custom_id || null,
  };
};

export const verifyPayPalWebhook = async (params: {
  headers: {
    transmissionId?: string;
    transmissionTime?: string;
    transmissionSig?: string;
    certUrl?: string;
    authAlgo?: string;
  };
  event: unknown;
}): Promise<boolean> => {
  const credentials = await getCredentials();
  if (!credentials.webhookId) {
    return true;
  }
  const { accessToken, environment } = await getPayPalAccessToken();
  const response = await fetch(`${getBaseUrl(environment)}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transmission_id: params.headers.transmissionId,
      transmission_time: params.headers.transmissionTime,
      cert_url: params.headers.certUrl,
      auth_algo: params.headers.authAlgo,
      transmission_sig: params.headers.transmissionSig,
      webhook_id: credentials.webhookId,
      webhook_event: params.event,
    }),
  });

  if (!response.ok) {
    return false;
  }
  const data = (await response.json()) as { verification_status?: string };
  return data.verification_status === 'SUCCESS';
};
