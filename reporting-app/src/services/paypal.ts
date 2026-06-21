import { env } from '../config/env.js';

const getBaseUrl = (): string =>
  env.PAYPAL_ENVIRONMENT === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

const requirePayPalConfig = () => {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET || !env.PAYPAL_PRO_PLAN_ID) {
    throw new Error('PayPal subscriptions are not configured');
  }
};

export const getPayPalAccessToken = async (): Promise<string> => {
  requirePayPalConfig();
  const credentials = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
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
  return data.access_token;
};

export const createPayPalSubscription = async (params: {
  accountNumber: number;
  email: string;
}): Promise<{ id: string; approveUrl: string | null; status: string }> => {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${getBaseUrl()}/v1/billing/subscriptions`, {
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
  if (!env.PAYPAL_WEBHOOK_ID) {
    return true;
  }
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${getBaseUrl()}/v1/notifications/verify-webhook-signature`, {
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
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: params.event,
    }),
  });

  if (!response.ok) {
    return false;
  }
  const data = (await response.json()) as { verification_status?: string };
  return data.verification_status === 'SUCCESS';
};
