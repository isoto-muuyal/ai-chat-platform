import { pool } from '../config/db.js';
import { sendEmail } from '../services/mailer.js';
import { logger } from '../config/logger.js';

type Report = {
  conversations: number;
  messages: number;
  users: number;
  trollRate: number;
  avgMessagesPerConversation: number;
  topTopics: Array<{ topic: string; count: number }>;
};

async function fetchOverview(days: number, accountNumber?: number): Promise<Report> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  cutoff.setUTCHours(0, 0, 0, 0);

  const convConditions = ['started_at >= $1'];
  const convParams: unknown[] = [cutoff];
  if (accountNumber !== undefined) {
    convConditions.push('account_number = $2');
    convParams.push(accountNumber);
  }

  const msgConditions = ['created_at >= $1'];
  const msgParams: unknown[] = [cutoff];
  if (accountNumber !== undefined) {
    msgConditions.push('account_number = $2');
    msgParams.push(accountNumber);
  }

  const [conversationsResult, messagesResult, usersResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int as count FROM conversations WHERE ${convConditions.join(' AND ')}`, convParams),
    pool.query(`SELECT COUNT(*)::int as count FROM messages WHERE ${msgConditions.join(' AND ')}`, msgParams),
    pool.query(
      `SELECT COUNT(DISTINCT roblox_user_id)::int as count FROM conversations WHERE ${convConditions.join(' AND ')}`,
      convParams
    ),
  ]);

  const trollRateResult = await pool.query(
    `SELECT 
      CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE (COUNT(*) FILTER (WHERE is_troll = true)::float / COUNT(*)::float * 100)
      END as troll_rate
    FROM messages
    WHERE ${msgConditions.join(' AND ')}`,
    msgParams
  );

  const avgMessagesResult = await pool.query(
    `SELECT 
      CASE 
        WHEN COUNT(DISTINCT conversation_id) = 0 THEN 0
        ELSE COUNT(*)::float / COUNT(DISTINCT conversation_id)::float
      END as avg_messages
    FROM messages
    WHERE ${msgConditions.join(' AND ')}`,
    msgParams
  );

  const topTopicsResult = await pool.query(
    `SELECT 
      COALESCE(topic, 'general') as topic,
      COUNT(*)::int as count
    FROM conversations
    WHERE ${convConditions.join(' AND ')}
    GROUP BY topic
    ORDER BY count DESC
    LIMIT 5`,
    convParams
  );

  return {
    conversations: conversationsResult.rows[0]?.count || 0,
    messages: messagesResult.rows[0]?.count || 0,
    users: usersResult.rows[0]?.count || 0,
    trollRate: parseFloat(trollRateResult.rows[0]?.troll_rate || '0'),
    avgMessagesPerConversation: parseFloat(avgMessagesResult.rows[0]?.avg_messages || '0'),
    topTopics: topTopicsResult.rows.map((row) => ({ topic: row.topic, count: row.count })),
  };
}

async function run() {
  const usersResult = await pool.query(
    `SELECT id, email, full_name, role, account_number 
     FROM app_users`
  );

  for (const user of usersResult.rows) {
    const report = await fetchOverview(7, user.role === 'sysadmin' ? undefined : user.account_number);
    const html = `
      <h2>Weekly report</h2>
      <p>Conversations: ${report.conversations}</p>
      <p>Messages: ${report.messages}</p>
      <p>Unique users: ${report.users}</p>
      <p>Troll rate: ${report.trollRate.toFixed(1)}%</p>
      <p>Avg messages/conversation: ${report.avgMessagesPerConversation.toFixed(1)}</p>
      <h3>Top topics</h3>
      <ul>
        ${report.topTopics.map((t) => `<li>${t.topic}: ${t.count}</li>`).join('')}
      </ul>
    `;

    await sendEmail({
      to: [{ email: user.email, name: user.full_name || user.email }],
      subject: 'Weekly reporting summary',
      text: `Conversations: ${report.conversations}, Messages: ${report.messages}`,
      html,
    });
  }

  logger.info('Weekly reports sent');
}

run().catch((err) => {
  logger.error({ err }, 'Weekly report job failed');
  process.exit(1);
});
