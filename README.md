# Avion-PEPT — storefront

Research peptide catalogue for Avion-PEPT, with product pages, strength variants, product FAQs, a cart and checkout preview, batch-test records, and a password-protected admin panel. The admin can create and edit products, manage each strength and SKU, upload product photos, write EN/ES descriptions and FAQs, and add batch analysis reports.

> Brand name, product copy, review numbers and legal pages are **placeholders**. Replace them before launch (see [Before launch](#before-launch)).

## Quick start

```bash
pnpm install
cp .env.example .env.local
# Set ADMIN_PASSWORD and SESSION_SECRET in .env.local before continuing.
pnpm db:push
pnpm db:seed
pnpm dev
```

- Store: http://localhost:3000 (redirects to `/en`)
- Admin: http://localhost:3000/admin — sign in with `ADMIN_PASSWORD` from `.env.local`
- Product editor: Admin → Products → Add product
- Dev emails are written to `tmp/mail/*.eml` and logged to the console
- Dev Keitaro postbacks go to `/api/dev/echo` and show in the server log and in Admin → Postbacks

Database-backed checkout now requires a verified, independently approved research account and explicit product/destination approvals. It accepts Stripe **test mode only**. See [Stripe checkout setup and Vercel environment variables](docs/stripe-checkout.md).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | `prisma generate` + production build |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm test` | Vitest unit/integration tests, including commerce security and webhook idempotency |
| `pnpm test:e2e` | Playwright: account gating, trusted checkout totals, cart persistence, order history, mobile layout. First run: `pnpm exec playwright install chromium` |
| `pnpm db:push` / `pnpm db:seed` / `pnpm db:studio` | Prisma schema sync / seed / browser |

**Run tests, typecheck, lint and build before deployment.** Next.js build does not replace a separate ESLint run.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind 4 + shadcn/ui (Base UI) · Zustand cart · Prisma (SQLite in dev, Postgres-compatible schema) · next-intl (`en`, `es` full; `de`, `nl` fall back to `en`) · iron-session admin auth · React Email + Resend adapter · Stripe.

## How it fits together

```
src/
  app/[locale]/          storefront (home, shop, products, checkout, order, testing, journal, legal, contact)
  app/admin/             admin (orders, products, coupons, postbacks, settings) + server actions
  app/api/               orders, checkout, coupons, contact, admin image uploads
  components/            layout/, store/, checkout/, admin/, ui/ (shadcn)
  config/shipping.ts     zones, prices, free-shipping thresholds, cutoff, delivery estimate
  lib/orders.ts          order state machine (create → PENDING → PAID → FULFILLED / EXPIRED / REFUNDED)
  lib/payments/          PaymentAdapter interface, Stripe test adapter, transactional webhooks
  lib/affiliate/         kt_attr cookie capture (client) + Keitaro postback (server)
  lib/email/             adapter + React Email templates
  messages/              en.json, es.json
prisma/schema.prisma     data model     prisma/seed.ts   peptide catalogue seed data
content/research/        journal articles: <slug>.<locale>.md
```

### Checkout and payments

The existing persistent cart and responsive checkout now require an authenticated, independently approved purchaser. Products and destinations are denied until explicitly approved in Admin → Approvals. Prices come from the database, and orders start `PENDING`. Stripe-hosted test Checkout is the only enabled adapter. Signed webhook events update orders and stock transactionally, deduplicate events, and trigger test confirmation email. Customer history and order status are owner-only.

Success, cancellation and failure pages preserve locale routing and never confirm payment from URL parameters. Open Stripe sessions must be expired/reconciled before related approvals change. Live keys and live-payment flags fail closed. Full architecture, migration, Stripe test instructions and operational limits are in [docs/stripe-checkout.md](docs/stripe-checkout.md).

### Affiliate tracking (Keitaro)

- Any page load with `?kt=` (or `subid`/`sub_id`), `?aff=` or `?sub1..5` writes a first-party `kt_attr` cookie (30 days, `SameSite=Lax`). **First touch wins** unless `?kt_override=1`.
- The cookie is copied onto `Order.affiliate` at order creation.
- Legacy/manual orders on `PAID`: server-side `GET KEITARO_POSTBACK_URL?subid=…&status=sale&tid=<orderNumber>&revenue=…&payout=…&key=…`, 3 attempts with backoff, every attempt logged as an `OrderEvent`.
- Legacy/manual orders on `REFUNDED`: same with `status=rejected`.
- Admin → Postbacks lists the log with a resend button. Stripe test orders do not automatically send affiliate postbacks.

Set `KEITARO_POSTBACK_URL` to your tracker's postback endpoint and `KEITARO_POSTBACK_KEY` if it requires one. Payout is `AFFILIATE_PAYOUT_CENTS` (editable in Admin → Settings).

### Analytics & consent

GTM loads only after the visitor accepts analytics cookies. `dataLayer` events: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`. Set `GTM_ID`.

### Shipping, currency, tax

- Zones, prices and thresholds: `src/config/shipping.ts`. Cutoff 16:00 Europe/Berlin, business days only.
- Catalogue prices are stored in EUR. Checkout defaults to EUR; Admin → Approvals can configure validated payment rates for supported storefront currencies. Display conversions remain estimates.
- Tax is currently a flat `0` line ("Tax (estimated)"). `TAX_MODE` is reserved in `.env` but only `none` is implemented — add VAT handling before selling.

## Deploying (Vercel)

1. Configure persistent PostgreSQL and follow [the checkout deployment guide](docs/stripe-checkout.md). Use `npm run db:deploy:vercel` for a new database and `npm run build:vercel` as the Vercel Build Command. SQLite remains local-only.
2. Add a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN` for persistent product image uploads.
3. Set `DATABASE_URL`, a unique `SESSION_SECRET` of at least 32 characters, and a strong `ADMIN_PASSWORD` in Vercel. Do not use the local preview password in production.
4. Batch report upload currently writes to `public/` and needs persistent object storage before using that upload on Vercel.
5. Commerce initiation and sign-in requests use database-backed limits; unrelated legacy endpoints retain their existing in-memory limiter.

## Before launch

- [ ] Confirm product details, permitted claims, regional legal requirements, real batch reports, and laboratory names before launch.
- [ ] Real review source and numbers (`REVIEWS_*`), or remove the rating chip and the `aggregateRating` JSON-LD. Don't ship invented ratings.
- [ ] The home page stats strip (batches tested, repeat customers, etc.) is placeholder copy — replace with real figures or remove.
- [ ] Legal pages (`src/app/[locale]/legal/[page]/page.tsx`) are generic templates; have them reviewed.
- [ ] Obtain written processor approval and independent review of research-product eligibility, destinations and applicable regulation before any separately implemented live launch.
- [ ] VAT/tax handling, and a cron for `expireStaleOrders()`.
