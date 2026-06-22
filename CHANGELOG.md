# Changelog

Notable changes to the platform, kept for future-context purposes (not user-facing release notes).

## 2026-06-22 — Public pages, pay-as-you-go credits, and admin console

Replaced the PayPal subscription/free-tier model with pay-as-you-go credits (1 credit = 1 chat message), added DB-backed CMS content for public pages, and built out the admin console (client management, PayPal setup, pricing, statistics).

### Database
- `reporting-app/sql/migrations/002_credits_cms_admin.sql` (idempotent, auto-applied on boot via `src/config/migrate.ts`):
  - `credit_packages`, `account_credits`, `credit_transactions` (with `price_usd` snapshot per purchase)
  - `cms_pages` (seeded: `about-us`, `how-it-works`, `privacy-statement`)
  - `contact_submissions`
  - `paypal_settings` (singleton row, encrypted client secret via `pgp_sym_encrypt`)
- Migrations now run automatically every boot (`runMigrations()` in `server.ts`); `Dockerfile` copies `sql/` into the production image.

### Billing model change
- `chat-api/src/services/usage-limits.ts` rewritten: gating is now based on `account_credits.balance` instead of a free-tier monthly limit. `recordUsage` decrements 1 credit per persisted user message.
- Removed `FREE_TIER_CONVERSATIONS_PER_MONTH` / `FREE_TIER_MESSAGES_PER_CONVERSATION` from `chat-api/config/env.ts`.
- `account_subscriptions` table and its routes/webhook were left in place but are no longer used for gating — credits are now the source of truth.
- `reporting-app/src/services/paypal.ts`: added PayPal Orders v2 one-time-purchase flow (`createPayPalOrder` / `capturePayPalOrder`) alongside the existing Billing Subscriptions flow. PayPal credentials are now resolved from the `paypal_settings` DB table first, falling back to `PAYPAL_*` env vars (60s in-memory cache).

### Public CMS pages
- `GET /api/cms/:slug` (no auth) serves `cms_pages` content.
- `POST /api/contact` stores to `contact_submissions` and emails the admin via MailerSend.
- `/about`, `/how-it-works`, `/privacy` now render via a generic `CmsPage` component instead of hardcoded JSX; added `/contact`.

### Your Account (user-facing)
- `GET /api/account/summary` returns balance, lifetime usage, transaction history, and active credit packages.
- `/account` page: buy credits via PayPal (redirect + capture-on-return flow), view balance/usage history.

### Admin console
- `/admin/clients` (renamed from `/admin/users`): client list now shows credit balance + a manual credit adjustment form per row.
- `/admin/content`: edit CMS page title/content (HTML).
- `/admin/paypal`: PayPal credentials form + credit package CRUD (this is where prices are configured).
- `/admin/statistics`: client counts, revenue, credits sold/consumed, per-client breakdown.

### Tests
- Updated `chat-api/test/chat.stream.test.ts` to mock the additional `account_credits` balance lookup introduced by the new `assertUsageAllowed`.

### Docs
- Root `README.md`: added "First-Time Setup: Accounts & .env Walkthrough" covering Postgres/Supabase, Gemini, MailerSend, and PayPal account creation, plus updated the `reporting-app` env var list.
- `reporting-app/.env.example`: added `CONTACT_NOTIFY_EMAIL`, `SUPABASE_*`, and `PAYPAL_*` entries.

Full implementation plan: `/Users/isoto/.claude/plans/mighty-exploring-sparrow.md`.
