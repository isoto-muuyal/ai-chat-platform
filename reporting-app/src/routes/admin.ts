import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { requireSysadmin } from '../middleware/auth.js';
import { hashPassword } from '../utils/password.js';
import { sendEmail } from '../services/mailer.js';
import { env } from '../config/env.js';
import { adjustCredits } from '../services/credits.js';

const router = Router();

router.use(requireSysadmin);

router.get('/users', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        u.id,
        u.email,
        u.full_name,
        u.company,
        u.role,
        u.account_number,
        u.language,
        u.theme,
        u.created_at,
        COALESCE(c.balance, 0) as credit_balance
      FROM app_users u
      LEFT JOIN account_credits c ON c.account_number = u.account_number
      ORDER BY u.created_at DESC`
    );

    return res.json({ users: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

const createUserSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
  company: z.string().max(120).optional().nullable(),
  password: z.string().min(8).max(128),
  role: z.enum(['user', 'sysadmin']).optional(),
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    const hashed = await hashPassword(data.password);

    const result = await pool.query(
      `INSERT INTO app_users (
        id,
        email,
        full_name,
        company,
        role,
        account_number,
        password_hash,
        language,
        theme,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        DEFAULT,
        $5,
        'en',
        'light',
        NOW(),
        NOW()
      )
      RETURNING id, email, full_name, company, role, account_number, language, theme`,
      [data.email.toLowerCase(), data.fullName, data.company ?? null, data.role ?? 'user', hashed]
    );

    const user = result.rows[0];
    const loginUrl = `${env.APP_BASE_URL.replace(/\/$/, '')}/login`;
    await sendEmail({
      to: [{ email: user.email, name: user.full_name || user.email }],
      subject: 'Your account is ready',
      text: `Your reporting account has been created. Login here: ${loginUrl}`,
      html: `<p>Your reporting account has been created.</p><p><a href="${loginUrl}">Login</a></p>`,
    });

    return res.status(201).json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

const adjustCreditsSchema = z.object({
  delta: z.number().int().refine((value) => value !== 0, 'delta must not be zero'),
  description: z.string().min(1).max(255),
});

router.post('/clients/:accountNumber/credits/adjust', async (req: Request, res: Response) => {
  try {
    const accountNumber = Number(req.params.accountNumber);
    if (!Number.isFinite(accountNumber)) {
      return res.status(400).json({ error: 'Invalid account number' });
    }
    const data = adjustCreditsSchema.parse(req.body);

    const balance = await adjustCredits({
      accountNumber,
      delta: data.delta,
      type: 'adjustment',
      description: data.description,
    });

    return res.json({ ok: true, balance });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Failed to adjust credits' });
  }
});

// --- CMS content management ---

router.get('/content', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT slug, title, content, updated_at FROM cms_pages ORDER BY slug ASC`
    );
    return res.json({ pages: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch content' });
  }
});

const updateContentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

router.put('/content/:slug', async (req: Request, res: Response) => {
  try {
    const data = updateContentSchema.parse(req.body);
    const result = await pool.query(
      `UPDATE cms_pages
       SET title = $1, content = $2, updated_at = NOW(), updated_by = $3
       WHERE slug = $4
       RETURNING slug, title, content, updated_at`,
      [data.title, data.content, req.session.userId, req.params.slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Failed to update content' });
  }
});

// --- Credit packages (pricing) ---

router.get('/credit-packages', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, credits, price_usd, active, sort_order FROM credit_packages ORDER BY sort_order ASC`
    );
    return res.json({ packages: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch credit packages' });
  }
});

const creditPackageSchema = z.object({
  name: z.string().min(1).max(120),
  credits: z.number().int().positive(),
  priceUsd: z.number().positive(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.post('/credit-packages', async (req: Request, res: Response) => {
  try {
    const data = creditPackageSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO credit_packages (name, credits, price_usd, active, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, name, credits, price_usd, active, sort_order`,
      [data.name, data.credits, data.priceUsd, data.active ?? true, data.sortOrder ?? 0]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Failed to create credit package' });
  }
});

router.put('/credit-packages/:id', async (req: Request, res: Response) => {
  try {
    const data = creditPackageSchema.parse(req.body);
    const result = await pool.query(
      `UPDATE credit_packages
       SET name = $1, credits = $2, price_usd = $3, active = $4, sort_order = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, credits, price_usd, active, sort_order`,
      [data.name, data.credits, data.priceUsd, data.active ?? true, data.sortOrder ?? 0, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit package not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Failed to update credit package' });
  }
});

router.delete('/credit-packages/:id', async (req: Request, res: Response) => {
  try {
    await pool.query(`DELETE FROM credit_packages WHERE id = $1`, [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete credit package' });
  }
});

// --- PayPal setup ---

router.get('/paypal-settings', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT environment, client_id, webhook_id,
        (client_secret_encrypted IS NOT NULL) as has_secret
       FROM paypal_settings WHERE id = 'default'`
    );
    const row = result.rows[0];
    return res.json({
      environment: row?.environment || 'sandbox',
      clientId: row?.client_id || '',
      webhookId: row?.webhook_id || '',
      hasSecret: row?.has_secret || false,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch PayPal settings' });
  }
});

const paypalSettingsSchema = z.object({
  environment: z.enum(['sandbox', 'live']),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1).optional(),
  webhookId: z.string().optional(),
});

router.put('/paypal-settings', async (req: Request, res: Response) => {
  try {
    const data = paypalSettingsSchema.parse(req.body);

    if (data.clientSecret) {
      await pool.query(
        `INSERT INTO paypal_settings (id, environment, client_id, client_secret_encrypted, webhook_id, updated_at)
         VALUES ('default', $1, $2, pgp_sym_encrypt($3, $4), $5, NOW())
         ON CONFLICT (id) DO UPDATE SET
           environment = $1,
           client_id = $2,
           client_secret_encrypted = pgp_sym_encrypt($3, $4),
           webhook_id = $5,
           updated_at = NOW()`,
        [data.environment, data.clientId, data.clientSecret, env.MESSAGE_ENCRYPTION_KEY, data.webhookId || null]
      );
    } else {
      await pool.query(
        `INSERT INTO paypal_settings (id, environment, client_id, webhook_id, updated_at)
         VALUES ('default', $1, $2, $3, NOW())
         ON CONFLICT (id) DO UPDATE SET
           environment = $1,
           client_id = $2,
           webhook_id = $3,
           updated_at = NOW()`,
        [data.environment, data.clientId, data.webhookId || null]
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Failed to save PayPal settings' });
  }
});

// --- Statistics ---

router.get('/statistics', async (_req: Request, res: Response) => {
  try {
    const [clientsResult, activeResult, salesResult, usageResult, perClientResult] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int as count FROM app_users`),
      pool.query(
        `SELECT COUNT(DISTINCT account_number)::int as count
         FROM credit_transactions
         WHERE type = 'usage' AND created_at >= NOW() - INTERVAL '30 days'`
      ),
      pool.query(
        `SELECT
          COUNT(*)::int as purchase_count,
          COALESCE(SUM(credits), 0)::int as credits_sold,
          COALESCE(SUM(price_usd), 0)::numeric as revenue_usd
        FROM credit_transactions WHERE type = 'purchase'`
      ),
      pool.query(
        `SELECT COALESCE(SUM(-credits), 0)::int as credits_consumed
         FROM credit_transactions WHERE type = 'usage'`
      ),
      pool.query(
        `SELECT
          u.account_number,
          u.full_name,
          u.company,
          COALESCE(c.balance, 0) as balance,
          COALESCE(SUM(t.credits) FILTER (WHERE t.type = 'purchase'), 0)::int as credits_purchased
        FROM app_users u
        LEFT JOIN account_credits c ON c.account_number = u.account_number
        LEFT JOIN credit_transactions t ON t.account_number = u.account_number
        GROUP BY u.account_number, u.full_name, u.company, c.balance
        ORDER BY u.account_number ASC`
      ),
    ]);

    return res.json({
      totalClients: clientsResult.rows[0]?.count || 0,
      activeClientsLast30Days: activeResult.rows[0]?.count || 0,
      totalPurchases: salesResult.rows[0]?.purchase_count || 0,
      totalCreditsSold: salesResult.rows[0]?.credits_sold || 0,
      totalRevenueUsd: salesResult.rows[0]?.revenue_usd || 0,
      totalCreditsConsumed: usageResult.rows[0]?.credits_consumed || 0,
      perClient: perClientResult.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// --- AI provider rate cards (cost calculator) ---

router.get('/ai-providers', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, input_price_per_million, output_price_per_million
       FROM ai_providers ORDER BY created_at ASC`
    );
    return res.json({ providers: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch AI providers' });
  }
});

const aiProviderSchema = z.object({
  name: z.string().min(1).max(120),
  inputPricePerMillion: z.number().nonnegative(),
  outputPricePerMillion: z.number().nonnegative(),
});

router.post('/ai-providers', async (req: Request, res: Response) => {
  try {
    const data = aiProviderSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO ai_providers (name, input_price_per_million, output_price_per_million, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, name, input_price_per_million, output_price_per_million`,
      [data.name, data.inputPricePerMillion, data.outputPricePerMillion]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Failed to create AI provider' });
  }
});

router.put('/ai-providers/:id', async (req: Request, res: Response) => {
  try {
    const data = aiProviderSchema.parse(req.body);
    const result = await pool.query(
      `UPDATE ai_providers
       SET name = $1, input_price_per_million = $2, output_price_per_million = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, input_price_per_million, output_price_per_million`,
      [data.name, data.inputPricePerMillion, data.outputPricePerMillion, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI provider not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Failed to update AI provider' });
  }
});

router.delete('/ai-providers/:id', async (req: Request, res: Response) => {
  try {
    await pool.query(`DELETE FROM ai_providers WHERE id = $1`, [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete AI provider' });
  }
});

// --- Infrastructure costs (cost calculator) ---

router.get('/infrastructure-costs', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, provider_name, server_type, monthly_cost_usd
       FROM infrastructure_costs ORDER BY created_at ASC`
    );
    return res.json({ items: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch infrastructure costs' });
  }
});

const infrastructureCostSchema = z.object({
  providerName: z.string().min(1).max(120),
  serverType: z.string().min(1).max(120),
  monthlyCostUsd: z.number().nonnegative(),
});

router.post('/infrastructure-costs', async (req: Request, res: Response) => {
  try {
    const data = infrastructureCostSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO infrastructure_costs (provider_name, server_type, monthly_cost_usd, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, provider_name, server_type, monthly_cost_usd`,
      [data.providerName, data.serverType, data.monthlyCostUsd]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Failed to create infrastructure cost' });
  }
});

router.put('/infrastructure-costs/:id', async (req: Request, res: Response) => {
  try {
    const data = infrastructureCostSchema.parse(req.body);
    const result = await pool.query(
      `UPDATE infrastructure_costs
       SET provider_name = $1, server_type = $2, monthly_cost_usd = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, provider_name, server_type, monthly_cost_usd`,
      [data.providerName, data.serverType, data.monthlyCostUsd, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Infrastructure cost not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Failed to update infrastructure cost' });
  }
});

router.delete('/infrastructure-costs/:id', async (req: Request, res: Response) => {
  try {
    await pool.query(`DELETE FROM infrastructure_costs WHERE id = $1`, [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete infrastructure cost' });
  }
});

export default router;
