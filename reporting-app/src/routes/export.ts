import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';
import { logger } from '../config/logger.js';
import { requireAuth } from '../middleware/auth.js';
import ExcelJS from 'exceljs';

const router = Router();

router.use(requireAuth);

// Helper to build filter clause
function buildFilterClause(req: Request): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (req.query.from) {
    const fromDate = new Date(req.query.from as string);
    fromDate.setUTCHours(0, 0, 0, 0);
    conditions.push(`m.created_at >= $${paramIndex}`);
    params.push(fromDate);
    paramIndex++;
  }
  if (req.query.to) {
    const toDate = new Date(req.query.to as string);
    toDate.setUTCHours(23, 59, 59, 999);
    conditions.push(`m.created_at <= $${paramIndex}`);
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
    conditions.push(`m.is_troll = $${paramIndex}`);
    params.push(isTroll);
    paramIndex++;
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

// GET /api/export/messages.csv
router.get('/messages.csv', async (req: Request, res: Response) => {
  try {
    const { clause, params } = buildFilterClause(req);

    const query = `
      SELECT 
        m.id,
        m.created_at,
        c.id as conversation_id,
        c.roblox_username,
        m.sender,
        m.content,
        c.topic,
        c.sentiment,
        m.is_troll
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      ${clause}
      ORDER BY m.created_at ASC
    `;

    const result = await pool.query(query, params);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="messages.csv"');

    res.write('ID,Created At,Conversation ID,Username,Sender,Content,Topic,Sentiment,Is Troll\n');

    for (const row of result.rows) {
      const line = [
        row.id,
        row.created_at,
        row.conversation_id,
        `"${(row.roblox_username || '').replace(/"/g, '""')}"`,
        `"${(row.sender || '').replace(/"/g, '""')}"`,
        `"${(row.content || '').replace(/"/g, '""')}"`,
        row.topic || '',
        row.sentiment || '',
        row.is_troll ? 'true' : 'false',
      ].join(',') + '\n';
      res.write(line);
    }

    res.end();
  } catch (err) {
    logger.error({ err }, 'Error exporting CSV');
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET /api/export/messages.xlsx
router.get('/messages.xlsx', async (req: Request, res: Response) => {
  try {
    const { clause, params } = buildFilterClause(req);

    const query = `
      SELECT 
        m.id,
        m.created_at,
        c.id as conversation_id,
        c.roblox_username,
        m.sender,
        m.content,
        c.topic,
        c.sentiment,
        m.is_troll
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      ${clause}
      ORDER BY m.created_at ASC
    `;

    const result = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Messages');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Conversation ID', key: 'conversation_id', width: 15 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Sender', key: 'sender', width: 20 },
      { header: 'Content', key: 'content', width: 50 },
      { header: 'Topic', key: 'topic', width: 20 },
      { header: 'Sentiment', key: 'sentiment', width: 15 },
      { header: 'Is Troll', key: 'is_troll', width: 10 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    result.rows.forEach((row) => {
      worksheet.addRow({
        id: row.id,
        created_at: row.created_at,
        conversation_id: row.conversation_id,
        username: row.roblox_username || '',
        sender: row.sender || '',
        content: row.content || '',
        topic: row.topic || '',
        sentiment: row.sentiment || '',
        is_troll: row.is_troll ? 'Yes' : 'No',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="messages.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error({ err }, 'Error exporting XLSX');
    res.status(500).json({ error: 'Failed to export XLSX' });
  }
});

// GET /api/export/topics.xlsx?days=30
router.get('/topics.xlsx', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    cutoff.setUTCHours(0, 0, 0, 0);

    const result = await pool.query(
      `SELECT 
        COALESCE(topic, 'general') as topic,
        COUNT(*)::int as count,
        ROUND(COUNT(*)::float / (SELECT COUNT(*) FROM conversations WHERE started_at >= $1)::float * 100, 2) as share
      FROM conversations
      WHERE started_at >= $1
      GROUP BY topic
      ORDER BY count DESC`,
      [cutoff]
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Topics');

    worksheet.columns = [
      { header: 'Topic', key: 'topic', width: 30 },
      { header: 'Count', key: 'count', width: 15 },
      { header: 'Share (%)', key: 'share', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    result.rows.forEach((row) => {
      worksheet.addRow({
        topic: row.topic,
        count: row.count,
        share: parseFloat(row.share || '0'),
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="topics.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error({ err }, 'Error exporting topics XLSX');
    res.status(500).json({ error: 'Failed to export topics' });
  }
});

export default router;
