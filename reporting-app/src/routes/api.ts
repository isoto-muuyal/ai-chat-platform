import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';
import { logger } from '../config/logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All API routes require authentication
router.use(requireAuth);

interface Totals {
  conversations: number;
  messages: number;
  users: number;
}

interface OverviewData {
  totals: {
    last7Days: Totals;
    last30Days: Totals;
    last90Days: Totals;
  };
  metrics: {
    trollRate: number;
    avgMessagesPerConversation: number;
  };
  topTopics: Array<{
    topic: string;
    count: number;
  }>;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const days7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get totals for last 7 days
    const totals7Days = await Promise.all([
      pool.query('SELECT COUNT(*)::int as count FROM conversations WHERE created_at >= $1', [days7]),
      pool.query('SELECT COUNT(*)::int as count FROM messages WHERE created_at >= $1', [days7]),
      pool.query('SELECT COUNT(*)::int as count FROM users WHERE created_at >= $1', [days7]),
    ]);

    // Get totals for last 30 days
    const totals30Days = await Promise.all([
      pool.query('SELECT COUNT(*)::int as count FROM conversations WHERE created_at >= $1', [days30]),
      pool.query('SELECT COUNT(*)::int as count FROM messages WHERE created_at >= $1', [days30]),
      pool.query('SELECT COUNT(*)::int as count FROM users WHERE created_at >= $1', [days30]),
    ]);

    // Get totals for last 90 days
    const totals90Days = await Promise.all([
      pool.query('SELECT COUNT(*)::int as count FROM conversations WHERE created_at >= $1', [days90]),
      pool.query('SELECT COUNT(*)::int as count FROM messages WHERE created_at >= $1', [days90]),
      pool.query('SELECT COUNT(*)::int as count FROM users WHERE created_at >= $1', [days90]),
    ]);

    // Get troll rate (percentage of messages marked as troll)
    const trollRateResult = await pool.query(
      `SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE (COUNT(*) FILTER (WHERE is_troll = true)::float / COUNT(*)::float * 100)
        END as troll_rate
      FROM messages`
    );

    // Get average messages per conversation
    const avgMessagesResult = await pool.query(
      `SELECT 
        CASE 
          WHEN COUNT(DISTINCT conversation_id) = 0 THEN 0
          ELSE COUNT(*)::float / COUNT(DISTINCT conversation_id)::float
        END as avg_messages
      FROM messages`
    );

    // Get top 10 topics
    const topTopicsResult = await pool.query(
      `SELECT 
        COALESCE(topic, 'Unknown') as topic,
        COUNT(*)::int as count
      FROM messages
      WHERE topic IS NOT NULL
      GROUP BY topic
      ORDER BY count DESC
      LIMIT $1`,
      [10]
    );

    // Get sentiment breakdown
    const sentimentResult = await pool.query(
      `SELECT 
        sentiment,
        COUNT(*)::int as count
      FROM messages
      WHERE sentiment IS NOT NULL
      GROUP BY sentiment`
    );

    // Build sentiment object
    const sentiment: { positive: number; neutral: number; negative: number } = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    sentimentResult.rows.forEach((row) => {
      const sent = row.sentiment?.toLowerCase();
      if (sent === 'positive') {
        sentiment.positive = row.count;
      } else if (sent === 'neutral') {
        sentiment.neutral = row.count;
      } else if (sent === 'negative') {
        sentiment.negative = row.count;
      }
    });

    const data: OverviewData = {
      totals: {
        last7Days: {
          conversations: totals7Days[0].rows[0]?.count || 0,
          messages: totals7Days[1].rows[0]?.count || 0,
          users: totals7Days[2].rows[0]?.count || 0,
        },
        last30Days: {
          conversations: totals30Days[0].rows[0]?.count || 0,
          messages: totals30Days[1].rows[0]?.count || 0,
          users: totals30Days[2].rows[0]?.count || 0,
        },
        last90Days: {
          conversations: totals90Days[0].rows[0]?.count || 0,
          messages: totals90Days[1].rows[0]?.count || 0,
          users: totals90Days[2].rows[0]?.count || 0,
        },
      },
      metrics: {
        trollRate: parseFloat(trollRateResult.rows[0]?.troll_rate || '0'),
        avgMessagesPerConversation: parseFloat(avgMessagesResult.rows[0]?.avg_messages || '0'),
      },
      topTopics: topTopicsResult.rows.map((row) => ({
        topic: row.topic,
        count: row.count,
      })),
      sentiment,
    };

    res.json(data);
  } catch (err) {
    logger.error({ err }, 'Error fetching overview data');
    res.status(500).json({ error: 'Failed to fetch overview data' });
  }
});

export default router;

