# Research checkout: configuration and operations

This integration uses Stripe-hosted Checkout in **test mode only**. It does not establish processor approval, legal eligibility, or regulatory compliance. No live key is accepted. `LIVE_PAYMENTS_ENABLED=true` disables session creation rather than enabling live payments. Keep it false until written processor approval and applicable product, destination, purchaser, tax, and regulatory checks are completed; a separately reviewed code change is required to implement live processing.

## Existing architecture

The existing Zustand `nps-cart` persists items, quantities and currency in localStorage. Its amounts are display estimates, never payment inputs. The existing responsive checkout, storefront styling, localized navigation, Prisma models, admin password login and iron-session cookies are retained. EN/ES contain the new account messages; DE/NL retain the existing English fallback.

1. `/{locale}/account`: sign in using an emailed one-time code (10 minutes, five attempts, HMAC stored in the database). Codes are consumed atomically. Institutional email verification alone grants no purchasing privileges.
2. The purchaser submits organization, registration/accreditation, institutional website, research purpose, role/contact information and an authorized-research attestation. Submission creates a pending review and an audit record.
3. `/admin/approvals`: an authenticated administrator independently verifies the organization, affiliation, intended use and applicable restrictions. Record actual sources, checks, reviewer name and rationale, then approve for 1–365 days or reject. Do not approve based only on the submitted text or checkbox. No automated compliance determination is made.
4. Separately approve each product's permitted country list and each shipping destination. Products and destinations default to unapproved; an existing shipping zone or the ROW fallback is not authorization. Editing a product resets its research approval.
5. `POST /api/orders`: requires the purchaser's encrypted session and matching Origin, validates approval and address country, re-reads active variants and EUR prices from Prisma, validates quantities, reserves stock atomically, and creates a `PENDING` order and checkout token. Client amount fields are ignored. Order email must match the verified account. Legacy orders are not automatically attached to accounts by email.
6. `POST /api/checkout/pay`: owner-only, same-origin, approval revalidation, configured currency and enabled-test-mode checks. The Stripe session uses the immutable database-priced order snapshot, stable per-order idempotency keys, a fixed shipping charge, disabled Adaptive Pricing, and metadata linking the payment intent and session to the order. Card data goes directly to Stripe. The registry exposes Stripe only; legacy mock/Ziina adapters cannot pay new orders.
7. `/api/checkout/webhook/stripe`: verifies the raw request signature using the Stripe SDK, rejects live events, validates session/order/amount/currency, and atomically records the event ID, status transition, checkout-session status, audit record and inventory changes. Duplicate IDs and duplicate semantic transitions are harmless. Unpaid completions are not marked paid. Late expiry/failure cannot downgrade paid orders. Full refund events can arrive before completion; partial refunds are recorded but do not mark the whole order refunded or restock it.
8. Success/cancel/failure pages only display owner-authorized database state. Redirects cannot mark orders paid. Cancellation preserves the cart and does not itself expire Stripe. `/{locale}/account` lists the account's latest 100 orders; order pages and polling endpoints require ownership and do not expose other purchasers' tokens or addresses.

Purchaser approval must outlast the hosted session. Before changing approvals or editing a product with open Stripe sessions, expire/reconcile those sessions in Admin → Orders. This also guards application resubmission. A Stripe session that is already open remains controlled by Stripe until expired or completed.

## Vercel environment variables

Set values separately for Development, Preview and Production; use an isolated test database and test Stripe account for Preview. Store credentials as Vercel Secrets, never as `NEXT_PUBLIC_*` values. Redeploy after changing build-time public flags. Do not commit `.env.local`.

| Variable | Required value / purpose |
| --- | --- |
| `DATABASE_URL` | Persistent PostgreSQL connection URL for Vercel. SQLite files on function storage are not durable. |
| `SESSION_SECRET` | Unique cryptographically random secret, at least 32 characters; shared across instances. Rotation invalidates both admin and purchaser sessions. |
| `ADMIN_PASSWORD` | Strong password for the existing admin authentication system. |
| `STORE_BASE_URL` | Trusted canonical origin, e.g. `https://preview.example.com`; HTTPS required in production. Do not use request Host to construct payment redirects. |
| `NEXT_PUBLIC_BROWSE_ONLY` | `false` to expose database-backed checkout; default is browse-only. This is not the payment security gate. |
| `NEXT_PUBLIC_DEMO_CHECKOUT` | `false` for an integration deployment. The existing simulated preview remains available separately. |
| `STRIPE_CHECKOUT_ENABLED` | `true` explicitly enables test session creation; default disabled. |
| `LIVE_PAYMENTS_ENABLED` | **`false`**. Setting true fails closed; it cannot turn this implementation live. |
| `STRIPE_SECRET_KEY` | Stripe `sk_test_...` secret key only. Never expose to the browser. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` for this deployment's test webhook endpoint. Local CLI and dashboard endpoints have different secrets. |
| `RESEND_API_KEY` | Required for email delivery in production, including sign-in codes. No production console-mail fallback. |
| `EMAIL_FROM` | Sender on a verified Resend domain. |
| `RESERVATION_MINUTES` | Default 35; constrained to at least 35 and at most 1440 for Stripe's session-expiry rules. Initiate payment within the first five minutes at the minimum setting. |
| `BRAND_NAME`, `LEGAL_ENTITY_NAME` | Existing store and checkout identification. |

No Stripe publishable key is required for hosted Checkout. `PAY_MOCK_ENABLED` and Ziina credentials do not enable checkout through the registry. Pause new payments with `STRIPE_CHECKOUT_ENABLED=false`; keep the test key and webhook secret configured so in-flight events can still be verified. Expire existing hosted sessions separately when pausing.

## Database setup

Local SQLite keeps `prisma/schema.prisma`. Prisma CLI does not load `.env.local` automatically; supply `DATABASE_URL` in your shell/CI environment (or use a local ignored `.env`). For an existing pre-integration SQLite database, take a consistent backup, then apply `prisma/upgrade-commerce.sql` once using `prisma db execute --file prisma/upgrade-commerce.sql --schema prisma/schema.prisma`. It preserves existing products, variants, orders and events; new approvals are intentionally absent. For a fresh local database, `npm run db:push` then `npm run db:seed`. Never seed a production database without reviewing the seed's behavior.

For a **new, empty PostgreSQL database** on Vercel:

```sh
# DATABASE_URL must point to the intended persistent Postgres database.
npm run db:deploy:vercel
npm run build:vercel
```

Set Vercel's Build Command to `npm run build:vercel`. Apply migrations as a controlled deployment step before the build. `prisma/postgresql.config.ts` selects `schema.postgresql.prisma` and `migrations-postgresql`. The initial migration is for an empty database. For an existing PostgreSQL installation, baseline its actual schema and generate/review an incremental migration; do not run the initial CREATE TABLE migration over existing tables. Migrating local SQLite data to PostgreSQL is a separate data-copy operation, not accomplished by changing `DATABASE_URL`.

The SQLite and PostgreSQL schema models must remain identical apart from the datasource provider; an automated test checks this. Run `prisma generate` for SQLite again before local tests after a PostgreSQL build.

## Stripe test setup and verification

Configure the endpoint `/api/checkout/webhook/stripe` in the Stripe test dashboard with these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`

Use the webhook API version matching the installed Stripe SDK. Local forwarding:

```sh
stripe listen --forward-to localhost:3000/api/checkout/webhook/stripe
```

Set the CLI's signing secret locally. Submit a research application and independently approve the test purchaser/product/destination, then use the storefront checkout and Stripe test cards. Actual card declines remain on Stripe's hosted page; asynchronous failure updates the order to `PAYMENT_FAILED`. The local failure page also handles checkout-initialization errors. A generic `stripe trigger` event without a real local order mapping cannot confirm an order.

```sh
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
# Alternatively use an already installed Chrome:
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

Unit/integration tests create a disposable SQLite database and exercise prices, quantities, approval checks, configured currencies, owner-only reads, session idempotency, raw signatures, duplicate and out-of-order events, failed payments and refunds. Browser tests run a separate server on port 3100 and an isolated `tmp/commerce-e2e.db`; they do not call Stripe's network. A real hosted Stripe test payment and deployed webhook delivery still need testing with your credentials.

## Operations and limits

Admin → Orders retains filtering, details and event history, and adds **Reconcile Stripe status** and **Expire Stripe session**. Reconciliation retrieves the session from Stripe and runs the same state transition. A refund request uses a stable idempotency key; only Stripe's refund event marks the order refunded. Test orders are visibly labeled and cannot be marked fulfilled. Test payments never automatically fire real affiliate sale/refund postbacks.

Stripe payment confirmation email has a durable pending audit record and a Resend idempotency key. Email failures cause webhook retries without repeating the database transition. Resend deduplication has a provider-defined retention window; inspect the audit/provider before manually replaying a very old failed notification. Admin resend remains a deliberate manual send.

Before a Stripe session exists, abandoned pending orders expire lazily on account/order/admin reads. Once Stripe creation starts, local timers never release reserved stock: only a signed expiry/failure event or server-retrieved reconciliation can do that. If Stripe creation times out after the provider accepted it, retry within the reservation window using the same order. If no Stripe session ID was recorded, investigate using the Stripe request idempotency key `checkout:<orderId>` and order metadata before releasing inventory. This intentionally favors holding inventory over overselling after an ambiguous payment request.

The existing database is shared by the admin session system; review audit entries use the existing shared admin account plus the entered reviewer name. Add individual staff identities before requiring individually attributable staff authentication. Sign-in requests and commerce initiation have persistent database rate limits; unrelated legacy endpoints retain their existing limiter.

Tax remains the existing zero-tax test calculation. Written processor approval, independently reviewed permitted products/destinations and applicable regulatory/tax checks are prerequisites for any separately implemented live launch. Test payment success is not authorization to ship goods.

References: [Stripe Checkout Session API](https://docs.stripe.com/api/checkout/sessions/create), [Stripe webhook signatures](https://docs.stripe.com/webhooks/signature), [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests).
