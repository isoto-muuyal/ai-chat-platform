import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

type Recipient = { email: string; name?: string };

export async function sendEmail(params: {
  to: Recipient[];
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const payload = {
    from: {
      email: env.MAIL_FROM,
      name: 'NPC Reporting',
    },
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  };

  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MAILERSEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, errorText }, 'MailerSend request failed');
    throw new Error('MailerSend request failed');
  }
}
