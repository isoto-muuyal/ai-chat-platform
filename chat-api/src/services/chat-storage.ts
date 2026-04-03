import { randomUUID } from 'crypto';
import { pool } from '../../config/db.js';
import { env } from '../../config/env.js';
import type { SentimentLabel } from './sentiment-analyzer.js';

export const persistInteraction = async (params: {
  conversationId: string;
  accountNumber: number;
  robloxUserId: number | null;
  robloxUsername?: string;
  userMessage: string;
  aiMessage: string;
  country?: string;
  topic: string | null;
  sentiment: SentimentLabel | null;
  isTroll: boolean;
  sourceClient: string | null;
}): Promise<void> => {
  const {
    conversationId,
    accountNumber,
    robloxUserId,
    robloxUsername,
    userMessage,
    aiMessage,
    country,
    topic,
    sentiment,
    isTroll,
    sourceClient,
  } = params;
  const now = new Date();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO conversations (
        id,
        account_number,
        roblox_user_id,
        roblox_username,
        started_at,
        last_message_at,
        topic,
        sentiment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        last_message_at = EXCLUDED.last_message_at,
        roblox_user_id = COALESCE(conversations.roblox_user_id, EXCLUDED.roblox_user_id),
        roblox_username = COALESCE(conversations.roblox_username, EXCLUDED.roblox_username),
        topic = COALESCE(conversations.topic, EXCLUDED.topic),
        sentiment = COALESCE(conversations.sentiment, EXCLUDED.sentiment)`,
      [
        conversationId,
        accountNumber,
        robloxUserId,
        robloxUsername ?? null,
        now,
        now,
        topic,
        sentiment,
      ]
    );

    await client.query(
      `INSERT INTO messages (
        id,
        conversation_id,
        sender,
        content,
        content_encrypted,
        created_at,
        account_number,
        is_troll,
        source_client
      ) VALUES ($1, $2, $3, $4, pgp_sym_encrypt($5, $6), $7, $8, $9, $10)`,
      [
        randomUUID(),
        conversationId,
        'user',
        null,
        userMessage,
        env.MESSAGE_ENCRYPTION_KEY,
        now,
        accountNumber,
        isTroll,
        sourceClient,
      ]
    );

    await client.query(
      `INSERT INTO messages (
        id,
        conversation_id,
        sender,
        content,
        content_encrypted,
        created_at,
        account_number,
        is_troll,
        source_client
      ) VALUES ($1, $2, $3, $4, pgp_sym_encrypt($5, $6), $7, $8, $9, $10)`,
      [
        randomUUID(),
        conversationId,
        'assistant',
        null,
        aiMessage,
        env.MESSAGE_ENCRYPTION_KEY,
        now,
        accountNumber,
        false,
        sourceClient,
      ]
    );

    if (robloxUserId !== null && country) {
      await client.query(
        `INSERT INTO analytics (
          id,
          roblox_user_id,
          account_number,
          country,
          inferred_age_range,
          created_at,
          source_client
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [randomUUID(), robloxUserId, accountNumber, country, null, now, sourceClient]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getOrCreateChannelConversation = async (
  accountNumber: number,
  sourceName: string,
  externalUserId: string
): Promise<string> => {
  const newConversationId = randomUUID();
  const result = await pool.query(
    `INSERT INTO channel_conversations (
      account_number,
      source_name,
      external_user_id,
      conversation_id,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (account_number, source_name, external_user_id)
    DO UPDATE SET updated_at = NOW()
    RETURNING conversation_id`,
    [accountNumber, sourceName, externalUserId, newConversationId]
  );

  return result.rows[0].conversation_id as string;
};
