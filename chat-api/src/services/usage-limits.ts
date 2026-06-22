import { pool } from '../../config/db.js';

type UsageAllowed = {
  allowed: true;
  balance: number;
};

type UsageBlocked = {
  allowed: false;
  reason: 'insufficient_credits';
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
  const result = await pool.query(
    `SELECT balance FROM account_credits WHERE account_number = $1`,
    [params.accountNumber]
  );
  const balance = Number(result.rows[0]?.balance || 0);

  if (balance <= 0) {
    return { allowed: false, reason: 'insufficient_credits', limit: 0 };
  }

  return { allowed: true, balance };
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const upserted = await client.query(
      `INSERT INTO account_credits (account_number, balance, updated_at)
       VALUES ($1, -1, NOW())
       ON CONFLICT (account_number)
       DO UPDATE SET balance = account_credits.balance - 1, updated_at = NOW()
       RETURNING balance`,
      [params.accountNumber]
    );
    const balanceAfter = Number(upserted.rows[0].balance);

    await client.query(
      `INSERT INTO credit_transactions (
        account_number, type, credits, balance_after, description, created_at
      ) VALUES ($1, 'usage', -1, $2, 'Chat message', NOW())`,
      [params.accountNumber, balanceAfter]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
