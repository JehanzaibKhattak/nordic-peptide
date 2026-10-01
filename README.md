# Avion-PEPT — storefront

Cosmetic peptide skincare store: catalogue, product pages with size variants, cart drawer, two-step checkout with a reservation timer, pluggable card payments (mock + Stripe), Keitaro affiliate tracking, batch-test library, journal, and a minimal admin. Runs fully locally with no external accounts.

> Brand name, product copy, review numbers and legal pages are **placeholders**. Replace them before launch (see [Before launch](#before-launch)).

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm db:push
pnpm db:seed
pnpm dev
```

- Store: http://localhost:3000 (redirects to `/en`)
- Admin: http://localhost:3000/admin — password is `ADMIN_PASSWORD` in `.env`
- Dev emails are written to `tmp/mail/*.eml` and logged to the console
- Dev Keitaro postbacks go to `/api/dev/echo` and show in the server log and in Admin → Postbacks

Test cards (mock adapter, dev only):

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Paid |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 0341` | Paid after a 5s delay (simulated 3DS) |

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | `prisma generate` + production build |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm test` | Vitest unit tests (shipping, money, mock cards, postback URL) |
| `pnpm test:e2e` | Playwright: purchase, declined card, attribution, Spanish locale. First run: `pnpm exec playwright install chromium` |
| `pnpm db:push` / `pnpm db:seed` / `pnpm db:studio` | Prisma schema sync / seed / browser |

**Always run `pnpm build` before pushing** — `tsc` alone misses ESLint errors that fail a Vercel deploy.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind 4 + shadcn/ui (Base UI) · Zustand cart · Prisma (SQLite in dev, Postgres-compatible schema) · next-intl (`en`, `es` full; `de`, `nl` fall back to `en`) · iron-session admin auth · React Email + Resend adapter · Stripe.

## How it fits together

```
src/
  app/[locale]/          storefront (home, shop, products, checkout, order, testing, journal, legal, contact)
  app/admin/             admin (orders, products, coupons, postbacks, settings) + server actions
  app/api/               orders, checkout (session/pay/mock-confirm/webhook), coupons, contact, dev echo
  components/            layout/, store/, checkout/, admin/, ui/ (shadcn)
  config/shipping.ts     zones, prices, free-shipping thresholds, cutoff, delivery estimate
  lib/orders.ts          order state machine (create → RESERVED → PAID → FULFILLED / EXPIRED / REFUNDED)
  lib/payments/          PaymentAdapter interface, mock + stripe adapters, registry
  lib/affiliate/         kt_attr cookie capture (client) + Keitaro postback (server)
  lib/email/             adapter + React Email templates
  messages/              en.json, es.json
prisma/schema.prisma     data model     prisma/seed.ts   4 categories, 12 products, batch tests, 2 coupons
content/research/        journal articles: <slug>.<locale>.md
```

### Checkout flow

1. Cart (Zustand, localStorage) → `/[locale]/checkout` collects contact, address and shipping method.
2. `POST /api/orders` re-prices everything server-side from the DB (client prices are never trusted), reserves stock atomically, creates the order as `RESERVED` with `reservedUntil = now + RESERVATION_MINUTES` and a single checkout session token.
3. `/[locale]/checkout/pay?session=TOKEN` shows the summary, a live countdown and the enabled payment adapters.
4. Payment success → `markPaid()` (idempotent) → status `PAID`, confirmation email, Keitaro postback.
5. `/[locale]/order/[number]` polls every 3s while unpaid and fires the `purchase` dataLayer event once (cookie-guarded).
6. If the timer runs out the order becomes `EXPIRED`, stock is released and payment is refused. Expiry is evaluated lazily on read (session load, order page, admin list) — there is no cron in dev. In production add a cron hitting an endpoint that calls `expireStaleOrders()` so abandoned stock is released even if nobody loads a page.

### Payments

`lib/payments/types.ts` defines `PaymentAdapter` (`createPayment`, `handleWebhook`, optional `refund`).

- **mock** — enabled when `PAY_MOCK_ENABLED=1` and never in production. Inline test card form.
- **stripe** — enabled when `STRIPE_SECRET_KEY` is set. Uses hosted Stripe Checkout. Point a webhook at `/api/checkout/webhook/stripe` (events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`) and set `STRIPE_WEBHOOK_SECRET`. Local testing: `stripe listen --forward-to localhost:3000/api/checkout/webhook/stripe`.

- **ziina** — enabled when `ZIINA_API_TOKEN` is set. Creates a Ziina Payment Intent for the order total (EUR, minor units) and redirects to Ziina's hosted page (card, Apple Pay, Google Pay). The intent id is stored on `Order.providerRef`.
  - Confirmation happens two ways, both re-fetching the intent from Ziina's API and checking amount + currency against the order: on the customer's return (`/checkout/complete`) and via webhook.
  - Register the webhook once: `POST https://api-v2.ziina.com/api/webhook` with `{ "url": "https://<store>/api/checkout/webhook/ziina", "secret": "<ZIINA_WEBHOOK_SECRET>" }` (token needs the `write_webhooks` scope; refunds need `write_refunds`).
  - `ZIINA_TEST=1` creates test intents. Set it to `0` for live payments.
  - No Ziina account yet? Uncomment the two `dev-fake` lines in `.env` to run the flow against the local fake at `/api/dev/ziina` (dev only).
  - The "pay by emailed link" flow is covered by the order-reserved email: its **Complete payment** button opens the payment page, which hands off to Ziina.
  - Payouts settle in AED. The message shown on Ziina's page is "<brand> — order <number>".

To add a provider, implement the interface and add it to `lib/payments/registry.ts`.

### Affiliate tracking (Keitaro)

- Any page load with `?kt=` (or `subid`/`sub_id`), `?aff=` or `?sub1..5` writes a first-party `kt_attr` cookie (30 days, `SameSite=Lax`). **First touch wins** unless `?kt_override=1`.
- The cookie is copied onto `Order.affiliate` at order creation.
- On `PAID`: server-side `GET KEITARO_POSTBACK_URL?subid=…&status=sale&tid=<orderNumber>&revenue=…&payout=…&key=…`, 3 attempts with backoff, every attempt logged as an `OrderEvent`.
- On `REFUNDED`: same with `status=rejected`.
- Admin → Postbacks lists the log with a resend button.

Set `KEITARO_POSTBACK_URL` to your tracker's postback endpoint and `KEITARO_POSTBACK_KEY` if it requires one. Payout is `AFFILIATE_PAYOUT_CENTS` (editable in Admin → Settings).

### Analytics & consent

GTM loads only after the visitor accepts analytics cookies. `dataLayer` events: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`. Set `GTM_ID`.

### Shipping, currency, tax

- Zones, prices and thresholds: `src/config/shipping.ts`. Cutoff 16:00 Europe/Berlin, business days only.
- Prices are stored and **charged in EUR**. GBP/USD are display-only conversions from a static rate table in `lib/money.ts`.
- Tax is currently a flat `0` line ("Tax (estimated)"). `TAX_MODE` is reserved in `.env` but only `none` is implemented — add VAT handling before selling.

## Deploying (Vercel + Postgres)

1. Change the Prisma datasource `provider` to `postgresql` and set `DATABASE_URL` (Supabase/Neon). The schema uses no SQLite-only features.
2. Set all env vars from `.env.example`; use a long random `SESSION_SECRET` and a strong `ADMIN_PASSWORD`; leave `PAY_MOCK_ENABLED` unset.
3. Product images and batch-test PDFs are written to `public/` — fine locally, but serverless filesystems are read-only. Move uploads to object storage (Supabase Storage / Vercel Blob) before using the admin upload in production.
4. The rate limiter is in-memory (per instance). Swap for Upstash/Vercel KV when running more than one instance.

## Before launch

- [ ] Real brand name, logo and product photography (`public/products/*.svg` are generated placeholders).
- [ ] Real formulas: the seeded INCI lists, concentrations and pH ranges are illustrative. Each product needs a Cosmetic Product Safety Report, a Responsible Person (EU and UK separately) and CPNP / SCPN notification before sale.
- [ ] Real batch reports and lab name — the seed uses dummy PDFs and a placeholder lab.
- [ ] Real review source and numbers (`REVIEWS_*`), or remove the rating chip and the `aggregateRating` JSON-LD. Don't ship invented ratings.
- [ ] The home page stats strip (batches tested, repeat customers, etc.) is placeholder copy — replace with real figures or remove.
- [ ] Legal pages (`src/app/[locale]/legal/[page]/page.tsx`) are generic templates; have them reviewed.
- [ ] Keep copy to cosmetic claims (appearance, hydration, feel). No medical or drug claims.
- [ ] VAT/tax handling, and a cron for `expireStaleOrders()`.
