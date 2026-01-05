import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { logger } from '../config/logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All API routes require authentication
router.use(requireAuth);

// Query param validation schemas
const daysSchema = z.enum(['7', '30', '90']).transform(Number);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// GET /api/overview?days=7|30|90
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 90;
    if (![7, 30, 90].includes(days)) {
      return res.status(400).json({ error: 'days must be 7, 30, or 90' });
    }

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    cutoff.setUTCHours(0, 0, 0, 0);

    // Get totals
    const [conversationsResult, messagesResult, usersResult] = await Promise.all([
      pool.query(
        'SELECT COUNT(*)::int as count FROM conversations WHERE started_at >= $1',
        [cutoff]
      ),
      pool.query(
        'SELECT COUNT(*)::int as count FROM messages WHERE created_at >= $1',
        [cutoff]
      ),
      pool.query(
        'SELECT COUNT(DISTINCT roblox_user_id)::int as count FROM conversations WHERE started_at >= $1',
        [cutoff]
      ),
    ]);

    // Get troll rate
    const trollRateResult = await pool.query(
      `SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE (COUNT(*) FILTER (WHERE is_troll = true)::float / COUNT(*)::float * 100)
        END as troll_rate
      FROM messages
      WHERE created_at >= $1`,
      [cutoff]
    );

    // Get avg messages per conversation
    const avgMessagesResult = await pool.query(
      `SELECT 
        CASE 
          WHEN COUNT(DISTINCT conversation_id) = 0 THEN 0
          ELSE COUNT(*)::float / COUNT(DISTINCT conversation_id)::float
        END as avg_messages
      FROM messages
      WHERE created_at >= $1`,
      [cutoff]
    );

    // Get top 10 topics
    const topTopicsResult = await pool.query(
      `SELECT 
        COALESCE(topic, 'Unknown') as topic,
        COUNT(*)::int as count
      FROM conversations
      WHERE started_at >= $1
        AND topic IS NOT NULL
      GROUP BY topic
      ORDER BY count DESC
      LIMIT $2`,
      [cutoff, 10]
    );

    // Get sentiment breakdown
    const sentimentResult = await pool.query(
      `SELECT 
        sentiment,
        COUNT(*)::int as count
      FROM conversations
      WHERE started_at >= $1
        AND sentiment IS NOT NULL
      GROUP BY sentiment`
    );

    const sentiment: { positive: number; neutral: number; negative: number } = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    sentimentResult.rows.forEach((row) => {
      const sent = row.sentiment?.toLowerCase();
      if (sent === 'positive') sentiment.positive = row.count;
      else if (sent === 'neutral') sentiment.neutral = row.count;
      else if (sent === 'negative') sentiment.negative = row.count;
    });

    res.json({
      totals: {
        conversations: conversationsResult.rows[0]?.count || 0,
        messages: messagesResult.rows[0]?.count || 0,
        users: usersResult.rows[0]?.count || 0,
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
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching overview');
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// GET /api/topics?days=30
router.get('/topics', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    cutoff.setUTCHours(0, 0, 0, 0);

    const result = await pool.query(
      `SELECT 
        COALESCE(topic, 'Unknown') as topic,
        COUNT(*)::int as count,
        ROUND(COUNT(*)::float / (SELECT COUNT(*) FROM conversations WHERE started_at >= $1)::float * 100, 2) as share
      FROM conversations
      WHERE started_at >= $1
      GROUP BY topic
      ORDER BY count DESC`,
      [cutoff]
    );

    res.json(
      result.rows.map((row) => ({
        topic: row.topic,
        count: row.count,
        share: parseFloat(row.share || '0'),
      }))
    );
  } catch (err) {
    logger.error({ err }, 'Error fetching topics');
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// GET /api/topics/timeseries?days=30&top=5
router.get('/topics/timeseries', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const top = parseInt(req.query.top as string) || 5;

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    cutoff.setUTCHours(0, 0, 0, 0);

    // Get top N topics
    const topTopicsResult = await pool.query(
      `SELECT 
        COALESCE(topic, 'Unknown') as topic
      FROM conversations
      WHERE started_at >= $1
        AND topic IS NOT NULL
      GROUP BY topic
      ORDER BY COUNT(*) DESC
      LIMIT $2`,
      [cutoff, top]
    );

    const topics = topTopicsResult.rows.map((row) => row.topic);

    // Get daily data for each topic
    const dailyData: Record<string, Array<{ date: string; count: number }>> = {};

    for (const topic of topics) {
      const result = await pool.query(
        `SELECT 
          (started_at AT TIME ZONE 'UTC')::date::text as date,
          COUNT(*)::int as count
        FROM conversations
        WHERE topic = $1
          AND started_at >= $2
        GROUP BY (started_at AT TIME ZONE 'UTC')::date
        ORDER BY date ASC`,
        [topic === 'Unknown' ? null : topic, cutoff]
      );

      dailyData[topic] = result.rows.map((row) => ({
        date: row.date,
        count: row.count,
      }));
    }

    // Generate all dates
    const allDates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - i);
      date.setUTCHours(0, 0, 0, 0);
      allDates.push(date.toISOString().split('T')[0]);
    }

    // Fill missing dates
    const filledData: Record<string, Array<{ date: string; count: number }>> = {};
    topics.forEach((topic) => {
      filledData[topic] = allDates.map((date) => {
        const existing = dailyData[topic]?.find((d) => d.date === date);
        return { date, count: existing?.count || 0 };
      });
    });

    res.json({ topics, dailyData: filledData, dates: allDates });
  } catch (err) {
    logger.error({ err }, 'Error fetching topics timeseries');
    res.status(500).json({ error: 'Failed to fetch topics timeseries' });
  }
});

// GET /api/troll?days=30
router.get('/troll', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    cutoff.setUTCHours(0, 0, 0, 0);

    // Daily troll data
    const dailyResult = await pool.query(
      `SELECT 
        (created_at AT TIME ZONE 'UTC')::date::text as date,
        COUNT(*)::int as total_messages,
        COUNT(*) FILTER (WHERE is_troll = true)::int as troll_messages
      FROM messages
      WHERE created_at >= $1
      GROUP BY (created_at AT TIME ZONE 'UTC')::date
      ORDER BY date ASC`,
      [cutoff]
    );

    // Top trolling topics
    const topTrollTopicsResult = await pool.query(
      `SELECT 
        COALESCE(c.topic, 'Unknown') as topic,
        COUNT(*) FILTER (WHERE m.is_troll = true)::int as troll_count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.created_at >= $1
        AND m.is_troll = true
      GROUP BY c.topic
      ORDER BY troll_count DESC
      LIMIT 10`,
      [cutoff]
    );

    // Generate all dates
    const allDates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - i);
      date.setUTCHours(0, 0, 0, 0);
      allDates.push(date.toISOString().split('T')[0]);
    }

    // Fill daily data
    const filledDaily = allDates.map((date) => {
      const existing = dailyResult.rows.find((row) => row.date === date);
      return {
        date,
        totalMessages: existing?.total_messages || 0,
        trollMessages: existing?.troll_messages || 0,
      };
    });

    res.json({
      daily: filledDaily,
      topTrollTopics: topTrollTopicsResult.rows.map((row) => ({
        topic: row.topic,
        count: row.troll_count,
      })),
      dates: allDates,
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching troll data');
    res.status(500).json({ error: 'Failed to fetch troll data' });
  }
});

// GET /api/users?days=90
router.get('/users', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 90;
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    cutoff.setUTCHours(0, 0, 0, 0);

    const result = await pool.query(
      `SELECT 
        c.roblox_user_id,
        c.roblox_username,
        COUNT(DISTINCT m.id)::int as message_count,
        COUNT(DISTINCT c.id)::int as conversation_count,
        MAX(c.last_message_at) as last_seen,
        a.country,
        a.inferred_age_range
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      LEFT JOIN analytics a ON a.roblox_user_id = c.roblox_user_id
      WHERE c.started_at >= $1
      GROUP BY c.roblox_user_id, c.roblox_username, a.country, a.inferred_age_range
      ORDER BY last_seen DESC`,
      [cutoff]
    );

    res.json(
      result.rows.map((row) => ({
        robloxUserId: row.roblox_user_id?.toString(),
        robloxUsername: row.roblox_username,
        messageCount: row.message_count,
        conversationCount: row.conversation_count,
        lastSeen: row.last_seen,
        country: row.country,
        inferredAgeRange: row.inferred_age_range,
      }))
    );
  } catch (err) {
    logger.error({ err }, 'Error fetching users');
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/conversations?from=YYYY-MM-DD&to=YYYY-MM-DD&topic=&sentiment=&user=&is_troll=&page=&pageSize=
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (req.query.from) {
      const fromDate = new Date(req.query.from as string);
      fromDate.setUTCHours(0, 0, 0, 0);
      conditions.push(`c.started_at >= $${paramIndex}`);
      params.push(fromDate);
      paramIndex++;
    }

    if (req.query.to) {
      const toDate = new Date(req.query.to as string);
      toDate.setUTCHours(23, 59, 59, 999);
      conditions.push(`c.started_at <= $${paramIndex}`);
      params.push(toDate);
      paramIndex++;
    }

    if (req.query.topic) {
      conditions.push(`c.topic = $${paramIndex}`);
      params.push(req.query.topic);
      paramIndex++;
    }

    if (req.query.sentiment) {
      conditions.push(`c.sentiment = $${paramIndex}`);
      params.push(req.query.sentiment);
      paramIndex++;
    }

    if (req.query.user) {
      const userStr = req.query.user as string;
      if (!isNaN(Number(userStr))) {
        conditions.push(`c.roblox_user_id = $${paramIndex}`);
        params.push(BigInt(userStr));
      } else {
        conditions.push(`c.roblox_username ILIKE $${paramIndex}`);
        params.push(`%${userStr}%`);
      }
      paramIndex++;
    }

    if (req.query.is_troll !== undefined) {
      const isTroll = req.query.is_troll === 'true' || req.query.is_troll === '1';
      conditions.push(`EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.conversation_id = c.id AND m.is_troll = $${paramIndex}
      )`);
      params.push(isTroll);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM conversations c ${whereClause}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    // Get conversations
    params.push(pageSize, offset);
    const result = await pool.query(
      `SELECT 
        c.id,
        c.roblox_user_id,
        c.roblox_username,
        c.started_at,
        c.last_message_at,
        c.topic,
        c.sentiment,
        COUNT(m.id)::int as message_count
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      ${whereClause}
      GROUP BY c.id, c.roblox_user_id, c.roblox_username, c.started_at, c.last_message_at, c.topic, c.sentiment
      ORDER BY c.started_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      conversations: result.rows.map((row) => ({
        id: row.id,
        robloxUserId: row.roblox_user_id?.toString(),
        robloxUsername: row.roblox_username,
        startedAt: row.started_at,
        lastMessageAt: row.last_message_at,
        topic: row.topic,
        sentiment: row.sentiment,
        messageCount: row.message_count,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching conversations');
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/conversations/:id
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;

    // Get conversation
    const convResult = await pool.query(
      `SELECT 
        id,
        roblox_user_id,
        roblox_username,
        started_at,
        last_message_at,
        topic,
        sentiment
      FROM conversations
      WHERE id = $1`,
      [conversationId]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages
    const messagesResult = await pool.query(
      `SELECT 
        id,
        sender,
        content,
        created_at,
        is_troll
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC`,
      [conversationId]
    );

    res.json({
      conversation: {
        id: convResult.rows[0].id,
        robloxUserId: convResult.rows[0].roblox_user_id?.toString(),
        robloxUsername: convResult.rows[0].roblox_username,
        startedAt: convResult.rows[0].started_at,
        lastMessageAt: convResult.rows[0].last_message_at,
        topic: convResult.rows[0].topic,
        sentiment: convResult.rows[0].sentiment,
      },
      messages: messagesResult.rows.map((row) => ({
        id: row.id,
        sender: row.sender,
        content: row.content,
        createdAt: row.created_at,
        isTroll: row.is_troll,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching conversation');
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

export default router;
