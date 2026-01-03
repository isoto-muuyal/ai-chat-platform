import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';
import { logger } from '../config/logger.js';
import { requireAuth } from '../middleware/auth.js';
import ExcelJS from 'exceljs';

const router = Router();

// All export routes require authentication
router.use(requireAuth);

// Helper function to build WHERE clause for filters
function buildFilterClause(req: Request): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (req.query.dateFrom) {
    conditions.push(`m.created_at >= $${paramIndex}`);
    params.push(new Date(req.query.dateFrom as string));
    paramIndex++;
  }
  if (req.query.dateTo) {
    conditions.push(`m.created_at <= $${paramIndex}`);
    params.push(new Date(req.query.dateTo as string));
    paramIndex++;
  }
  if (req.query.topic) {
    conditions.push(`m.topic = $${paramIndex}`);
    params.push(req.query.topic);
    paramIndex++;
  }
  if (req.query.sentiment) {
    conditions.push(`m.sentiment = $${paramIndex}`);
    params.push(req.query.sentiment);
    paramIndex++;
  }
  if (req.query.userId) {
    conditions.push(`c.user_id = $${paramIndex}`);
    params.push(req.query.userId);
    paramIndex++;
  }
  if (req.query.isTroll !== undefined) {
    const isTroll = req.query.isTroll === 'true' || req.query.isTroll === '1';
    conditions.push(`m.is_troll = $${paramIndex}`);
    params.push(isTroll);
    paramIndex++;
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

// Export messages as CSV
router.get('/messages.csv', async (req: Request, res: Response) => {
  try {
    const { clause, params } = buildFilterClause(req);

    const query = `
      SELECT 
        m.id,
        m.created_at,
        c.id as conversation_id,
        u.username,
        m.content,
        m.topic,
        m.sentiment,
        m.is_troll
      FROM messages m
      LEFT JOIN conversations c ON m.conversation_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      ${clause}
      ORDER BY m.created_at ASC
    `;

    const result = await pool.query(query, params);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="messages.csv"');

    // Write CSV header
    res.write('ID,Created At,Conversation ID,Username,Content,Topic,Sentiment,Is Troll\n');

    // Write CSV rows
    for (const row of result.rows) {
      const line = [
        row.id,
        row.created_at,
        row.conversation_id,
        `"${(row.username || '').replace(/"/g, '""')}"`,
        `"${(row.content || '').replace(/"/g, '""')}"`,
        row.topic || '',
        row.sentiment || '',
        row.is_troll ? 'true' : 'false',
      ].join(',') + '\n';
      res.write(line);
    }

    res.end();
  } catch (err) {
    logger.error({ err }, 'Error exporting messages to CSV');
    res.status(500).json({ error: 'Failed to export messages' });
  }
});

// Export messages as XLSX
router.get('/messages.xlsx', async (req: Request, res: Response) => {
  try {
    const { clause, params } = buildFilterClause(req);

    const query = `
      SELECT 
        m.id,
        m.created_at,
        c.id as conversation_id,
        u.username,
        m.content,
        m.topic,
        m.sentiment,
        m.is_troll
      FROM messages m
      LEFT JOIN conversations c ON m.conversation_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      ${clause}
      ORDER BY m.created_at ASC
    `;

    const result = await pool.query(query, params);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Messages');

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Conversation ID', key: 'conversation_id', width: 15 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Content', key: 'content', width: 50 },
      { header: 'Topic', key: 'topic', width: 20 },
      { header: 'Sentiment', key: 'sentiment', width: 15 },
      { header: 'Is Troll', key: 'is_troll', width: 10 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    result.rows.forEach((row) => {
      worksheet.addRow({
        id: row.id,
        created_at: row.created_at,
        conversation_id: row.conversation_id,
        username: row.username || '',
        content: row.content || '',
        topic: row.topic || '',
        sentiment: row.sentiment || '',
        is_troll: row.is_troll ? 'Yes' : 'No',
      });
    });

    // Set headers for XLSX download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="messages.xlsx"');

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error({ err }, 'Error exporting messages to XLSX');
    res.status(500).json({ error: 'Failed to export messages' });
  }
});

export default router;

