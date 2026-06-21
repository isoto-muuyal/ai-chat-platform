import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { logger } from '../config/logger.js';
import { requireAuth } from '../middleware/auth.js';
import { createPayPalSubscription, verifyPayPalWebhook } from '../services/paypal.js';

const router = Router();

const paypalWebhookSchema = z.object({
  event_type: z.string().min(1),
  resource: z
    .object({
      id: z.string().optional(),
      custom_id: z.string().optional(),
      status: z.string().optional(),
      billing_info: z
        .object({
          next_billing_time: z.string().optional(),
        })
        .optional(),
    })
    .passthrough(),
});

router.post('/paypal/subscriptions', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.session.accountNumber === undefined || !req.session.email) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const subscription = await createPayPalSubscription({
      accountNumber: req.session.accountNumber,
      email: req.session.email,
    });

    await pool.query(
      `INSERT INTO account_subscriptions (
        account_number, plan, provider, provider_subscription_id, status, created_at, updated_at
      ) VALUES ($1, 'pro', 'paypal', $2, $3, NOW(), NOW())
      ON CONFLICT (account_number)
      DO UPDATE SET
        plan = 'pro',
        provider = 'paypal',
        provider_subscription_id = $2,
        status = $3,
        updated_at = NOW()`,
      [req.session.accountNumber, subscription.id, subscription.status.toLowerCase()]
    );

    return res.status(201).json(subscription);
  } catch (error) {
    logger.error({ err: error }, 'Failed to create PayPal subscription');
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create subscription' });
  }
});

router.post('/paypal/webhook', async (req: Request, res: Response) => {
  try {
    const verified = await verifyPayPalWebhook({
      headers: {
        transmissionId: req.header('paypal-transmission-id') || undefined,
        transmissionTime: req.header('paypal-transmission-time') || undefined,
        transmissionSig: req.header('paypal-transmission-sig') || undefined,
        certUrl: req.header('paypal-cert-url') || undefined,
        authAlgo: req.header('paypal-auth-algo') || undefined,
      },
      event: req.body,
    });
    if (!verified) {
      return res.status(401).json({ error: 'Invalid PayPal webhook signature' });
    }

    const event = paypalWebhookSchema.parse(req.body);
    const subscriptionId = event.resource.id;
    const accountNumber = event.resource.custom_id ? Number(event.resource.custom_id) : null;
    const status = event.resource.status || event.event_type;
    const currentPeriodEnd = event.resource.billing_info?.next_billing_time
      ? new Date(event.resource.billing_info.next_billing_time)
      : null;

    if (!subscriptionId && !accountNumber) {
      return res.json({ ok: true });
    }

    if (accountNumber && Number.isFinite(accountNumber)) {
      await pool.query(
        `INSERT INTO account_subscriptions (
          account_number, plan, provider, provider_subscription_id, status, current_period_end, created_at, updated_at
        ) VALUES ($1, 'pro', 'paypal', $2, $3, $4, NOW(), NOW())
        ON CONFLICT (account_number)
        DO UPDATE SET
          plan = 'pro',
          provider = 'paypal',
          provider_subscription_id = COALESCE($2, account_subscriptions.provider_subscription_id),
          status = $3,
          current_period_end = COALESCE($4, account_subscriptions.current_period_end),
          updated_at = NOW()`,
        [accountNumber, subscriptionId || null, status.toLowerCase(), currentPeriodEnd]
      );
    } else if (subscriptionId) {
      await pool.query(
        `UPDATE account_subscriptions
         SET status = $1, current_period_end = COALESCE($2, current_period_end), updated_at = NOW()
         WHERE provider = 'paypal' AND provider_subscription_id = $3`,
        [status.toLowerCase(), currentPeriodEnd, subscriptionId]
      );
    }

    return res.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid webhook' });
    }
    logger.error({ err: error }, 'PayPal webhook failed');
    return res.status(500).json({ error: 'Webhook failed' });
  }
});

export default router;
