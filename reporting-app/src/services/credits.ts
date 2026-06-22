import { pool } from '../config/db.js';

export type CreditTransactionType = 'purchase' | 'usage' | 'adjustment';

export const getBalance = async (accountNumber: number): Promise<number> => {
  const result = await pool.query(
    `SELECT balance FROM account_credits WHERE account_number = $1`,
    [accountNumber]
  );
  return Number(result.rows[0]?.balance || 0);
};

export const adjustCredits = async (params: {
  accountNumber: number;
  delta: number;
  type: CreditTransactionType;
  description?: string;
  provider?: string;
  providerReference?: string;
  priceUsd?: number;
}): Promise<number> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const upserted = await client.query(
      `INSERT INTO account_credits (account_number, balance, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (account_number)
       DO UPDATE SET balance = account_credits.balance + $2, updated_at = NOW()
       RETURNING balance`,
      [params.accountNumber, params.delta]
    );
    const balanceAfter = Number(upserted.rows[0].balance);

    await client.query(
      `INSERT INTO credit_transactions (
        account_number, type, credits, balance_after, description, provider, provider_reference, price_usd, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        params.accountNumber,
        params.type,
        params.delta,
        balanceAfter,
        params.description || null,
        params.provider || null,
        params.providerReference || null,
        params.priceUsd ?? null,
      ]
    );

    await client.query('COMMIT');
    return balanceAfter;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
