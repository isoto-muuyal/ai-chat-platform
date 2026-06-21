import { env } from '../config/env.js';

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    company?: string;
  };
};

type SupabaseTokenResponse = {
  access_token?: string;
  user?: SupabaseUser;
  error?: string;
  error_description?: string;
  msg?: string;
};

const requireSupabaseConfig = () => {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase auth is not configured');
  }
  return {
    url: env.SUPABASE_URL.replace(/\/$/, ''),
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
};

const supabaseError = async (response: Response): Promise<Error> => {
  let message = `Supabase request failed with ${response.status}`;
  try {
    const data = (await response.json()) as SupabaseTokenResponse;
    message = data.error_description || data.msg || data.error || message;
  } catch {
    // keep default
  }
  return new Error(message);
};

export const getGoogleAuthUrl = (redirectTo: string): string => {
  const { url, anonKey } = requireSupabaseConfig();
  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: redirectTo,
  });
  return `${url}/auth/v1/authorize?${params.toString()}&apikey=${encodeURIComponent(anonKey)}`;
};

export const signUpWithPassword = async (params: {
  email: string;
  password: string;
  fullName: string;
  company?: string | null;
  redirectTo?: string;
}): Promise<SupabaseUser | null> => {
  const { url, anonKey } = requireSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      data: {
        full_name: params.fullName,
        company: params.company || '',
      },
      ...(params.redirectTo ? { options: { emailRedirectTo: params.redirectTo } } : {}),
    }),
  });

  if (!response.ok) {
    throw await supabaseError(response);
  }

  const data = (await response.json()) as SupabaseTokenResponse;
  return data.user || null;
};

export const signInWithPassword = async (email: string, password: string): Promise<SupabaseUser> => {
  const { url, anonKey } = requireSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw await supabaseError(response);
  }

  const data = (await response.json()) as SupabaseTokenResponse;
  if (!data.user) {
    throw new Error('Supabase login did not return a user');
  }
  return data.user;
};

export const getUserFromAccessToken = async (accessToken: string): Promise<SupabaseUser> => {
  const { url, anonKey } = requireSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw await supabaseError(response);
  }

  return (await response.json()) as SupabaseUser;
};

export const getSupabaseUserEmail = (user: SupabaseUser): string => {
  if (!user.email) {
    throw new Error('Supabase user is missing an email address');
  }
  return user.email.toLowerCase();
};

export const getSupabaseDisplayName = (user: SupabaseUser): string => {
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User';
};

export const getSupabaseCompany = (user: SupabaseUser): string | null => {
  return user.user_metadata?.company || null;
};
