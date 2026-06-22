import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';

const router = Router();

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT slug, title, content, updated_at FROM cms_pages WHERE slug = $1`,
      [req.params.slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load page' });
  }
});

export default router;
