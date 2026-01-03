import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';
import { logger } from '../config/logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All API routes require authentication
router.use(requireAuth);

// Get conversations list with filters and pagination
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Build WHERE clause with parameterized queries
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Date range filter
    if (req.query.dateFrom) {
      conditions.push(`c.created_at >= $${paramIndex}`);
      params.push(new Date(req.query.dateFrom as string));
      paramIndex++;
    }
    if (req.query.dateTo) {
      conditions.push(`c.created_at <= $${paramIndex}`);
      params.push(new Date(req.query.dateTo as string));
      paramIndex++;
    }

    // Topic filter
    if (req.query.topic) {
      conditions.push(`EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.conversation_id = c.id 
        AND m.topic = $${paramIndex}
      )`);
      params.push(req.query.topic);
      paramIndex++;
    }

    // Sentiment filter
    if (req.query.sentiment) {
      conditions.push(`EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.conversation_id = c.id 
        AND m.sentiment = $${paramIndex}
      )`);
      params.push(req.query.sentiment);
      paramIndex++;
    }

    // User filter
    if (req.query.userId) {
      conditions.push(`c.user_id = $${paramIndex}`);
      params.push(req.query.userId);
      paramIndex++;
    }

    // Is troll filter
    if (req.query.isTroll !== undefined) {
      const isTroll = req.query.isTroll === 'true' || req.query.isTroll === '1';
      conditions.push(`EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.conversation_id = c.id 
        AND m.is_troll = $${paramIndex}
      )`);
      params.push(isTroll);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*)::int as total FROM conversations c ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0]?.total || 0;

    // Get conversations with pagination
    params.push(limit, offset);
    const conversationsQuery = `
      SELECT 
        c.id,
        c.created_at,
        c.user_id,
        u.username,
        COUNT(m.id)::int as message_count,
        COUNT(m.id) FILTER (WHERE m.is_troll = true)::int as troll_count
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN messages m ON m.conversation_id = c.id
      ${whereClause}
      GROUP BY c.id, c.created_at, c.user_id, u.username
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const conversationsResult = await pool.query(conversationsQuery, params);

    res.json({
      conversations: conversationsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching conversations');
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get conversation detail with messages
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;

    // Get conversation info
    const convQuery = `
      SELECT 
        c.id,
        c.created_at,
        c.user_id,
        u.username
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;
    const convResult = await pool.query(convQuery, [conversationId]);

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages for this conversation
    const messagesQuery = `
      SELECT 
        id,
        created_at,
        content,
        topic,
        sentiment,
        is_troll
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `;
    const messagesResult = await pool.query(messagesQuery, [conversationId]);

    res.json({
      conversation: convResult.rows[0],
      messages: messagesResult.rows,
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching conversation detail');
    res.status(500).json({ error: 'Failed to fetch conversation detail' });
  }
});

export default router;

