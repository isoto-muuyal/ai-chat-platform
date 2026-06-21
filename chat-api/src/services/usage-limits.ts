import { pool } from '../../config/db.js';
import { env } from '../../config/env.js';

type UsageAllowed = {
  allowed: true;
  plan: string;
};

type UsageBlocked = {
  allowed: false;
  plan: string;
  reason: 'monthly_conversation_limit' | 'conversation_message_limit';
  limit: number;
};

const getUsageMonth = (): string => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

export const assertUsageAllowed = async (params: {
  accountNumber: number;
  conversationId: string;
}): Promise<UsageAllowed | UsageBlocked> => {
  const subscriptionResult = await pool.query(
    `SELECT plan, status
     FROM account_subscriptions
     WHERE account_number = $1`,
    [params.accountNumber]
  );
  const subscription = subscriptionResult?.rows?.[0];
  const plan = subscription?.plan || 'free';
  const status = subscription?.status || 'active';

  if (plan !== 'free' && ['active', 'approval_pending', 'approved'].includes(String(status).toLowerCase())) {
    return { allowed: true, plan };
  }

  const month = getUsageMonth();
  const [monthlyResult, conversationResult, existingConversationResult] = await Promise.all([
    pool.query(
      `SELECT conversations_count
       FROM account_usage_monthly
       WHERE account_number = $1 AND usage_month = $2`,
      [params.accountNumber, month]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM messages
       WHERE account_number = $1 AND conversation_id = $2 AND sender = 'user'`,
      [params.accountNumber, params.conversationId]
    ),
    pool.query(
      `SELECT 1
       FROM conversations
       WHERE account_number = $1 AND id = $2
       LIMIT 1`,
      [params.accountNumber, params.conversationId]
    ),
  ]);

  const isNewConversation = (existingConversationResult?.rows?.length || 0) === 0;
  const monthlyCount = Number(monthlyResult?.rows?.[0]?.conversations_count || 0);
  if (isNewConversation && monthlyCount >= env.FREE_TIER_CONVERSATIONS_PER_MONTH) {
    return {
      allowed: false,
      plan,
      reason: 'monthly_conversation_limit',
      limit: env.FREE_TIER_CONVERSATIONS_PER_MONTH,
    };
  }

  const userMessageCount = Number(conversationResult?.rows?.[0]?.count || 0);
  if (userMessageCount >= env.FREE_TIER_MESSAGES_PER_CONVERSATION) {
    return {
      allowed: false,
      plan,
      reason: 'conversation_message_limit',
      limit: env.FREE_TIER_MESSAGES_PER_CONVERSATION,
    };
  }

  return { allowed: true, plan };
};

export const recordUsage = async (params: {
  accountNumber: number;
  conversationId: string;
}): Promise<void> => {
  const month = getUsageMonth();
  const conversationResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM messages
     WHERE account_number = $1 AND conversation_id = $2 AND sender = 'user'`,
    [params.accountNumber, params.conversationId]
  );
  const isFirstPersistedUserMessage = Number(conversationResult?.rows?.[0]?.count || 0) === 1;

  await pool.query(
    `INSERT INTO account_usage_monthly (
      account_number, usage_month, conversations_count, messages_count, created_at, updated_at
    ) VALUES ($1, $2, $3, 1, NOW(), NOW())
    ON CONFLICT (account_number, usage_month)
    DO UPDATE SET
      conversations_count = account_usage_monthly.conversations_count + $3,
      messages_count = account_usage_monthly.messages_count + 1,
      updated_at = NOW()`,
    [params.accountNumber, month, isFirstPersistedUserMessage ? 1 : 0]
  );
};
