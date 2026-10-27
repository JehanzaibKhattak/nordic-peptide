# Argent hosted checkout integration

Implemented from the supplied PaymentJS guide and the official API schema, with the current official PaymentJS source inspected on 26 October 2026. This is built and fixture-tested, with real-provider USD success/decline testing now recorded in [the USD test report](argent-usd-test-report.md). Live card checkout is not activated. Existing bank-transfer checkout stays available.

Sources:
- https://api.argentplatforms.com/docs
- https://api.argentplatforms.com/schema/
- https://js.argentplatforms.com/payment.min.js
- Client-supplied `ArgentPlatforms _ PaymentJS.pdf`

## Flow

1. Enabling the configured provider exposes a Card option in standard guest checkout and the RETA lander. Order totals, RETA discounts and currency are calculated on the server. Live mode supports GBP in this first integration; an isolated test environment can set `ARGENT_TEST_CURRENCY=USD` or `EUR`.
2. The saved private checkout session takes the buyer to `/en/checkout/argent?session=...`. The guest HttpOnly cookie or purchaser login must own the order. An opaque session token alone does not grant access.
3. Clicking Continue requests a hosted intent through the storefront server. Basic authentication uses the private secret key, with a blank password. The API receives the saved total in decimal GBP, the order number as reference, `merchant_initiated:false`, and `flow:hosted`. No card data touches the storefront.
4. A unique `ArgentPayment.orderId` is committed before the POST. The server validates reference, amount, currency, company and mode, saves the intent, then constructs the hosted URL using the returned URL, ID, token and public key. These continuation parameters match the official PaymentJS implementation. HTTPS hosted origins must be explicitly allowlisted.
5. Returning query parameters are ignored. The private receipt, signed webhook or reconciliation worker retrieves the saved intent and captured payment through the secret API. A matching `completed` intent plus its matching `paid` capture is required.
6. For live orders, Avion independently retrieves that intent and payment before it marks the source-scoped order paid and queues Keitaro through the existing sender. The storefront records payment only after the back office accepts it. A readiness check against that back office must pass before live intent creation.
7. Test-mode orders never enter Avion, fulfilment or affiliate reporting. The paid email is labelled as a test; tests mock email and network calls. Production card orders use the established confirmation email with a durable pending record and idempotency key.
8. Full refunds are requested once and remain pending until provider retrieval confirms `refunded`. The backend then reverses tracking and stops packing (already-shipped orders go to attention). Partial refunds require manual review. A provider refund arriving before the local paid notification does not enqueue fulfilment notifications.

The raw HMAC SHA-256 webhook signature uses `X-ArgentPlatforms-Signature`. Requests are bounded to 64 KiB, signatures use constant-time comparison, and replayed notifications re-read authoritative provider state. Provider metadata/status from the browser or webhook is never used as proof of payment. Unknown webhook shapes are ignored; the worker and private receipt provide independent reconciliation.

## Configuration

All Argent variables below are private server settings; none uses a `NEXT_PUBLIC_` prefix.

```dotenv
ARGENT_CHECKOUT_ENABLED=false
ARGENT_CONTRACT_CONFIRMED=false
ARGENT_MODE=test
ARGENT_ALLOW_LIVE=false
ARGENT_PUBLIC_KEY=
ARGENT_SECRET_KEY=
ARGENT_WEBHOOK_SECRET=
ARGENT_COMPANY_ID=
ARGENT_HOSTED_ORIGINS=
ARGENT_HOSTED_PAYMENT_PAGE_URL=https://pay.argentplatforms.com
ARGENT_TEST_CURRENCY=GBP
```

`ARGENT_HOSTED_ORIGINS` is a comma-separated list of exact approved HTTPS origins without trailing slashes. Obtain the actual hosted origin from Argent; do not use a guessed domain. `ARGENT_COMPANY_ID` is the provider's ID for the approved Ace Consumer Electronics merchant account, not its display name.

Existing settings are also required: `SESSION_SECRET`, `STORE_BASE_URL`, GBP checkout currency, existing Avion source/API credentials for live mode, and `CRON_SECRET` for the worker. Standard checkout supports card-only setup if bank transfer is disabled. Inventory mode continues to follow the existing offline-inventory setting.

Before setting `ARGENT_CONTRACT_CONFIRMED=true`, confirm in test mode that API amounts are decimal major units, server-created hosted intents return the expected draft/token/URL contract, the captured-payment response has the documented ID/status, and webhook events use one of the supported intent identifier fields. The fixture responses are not a substitute for a real merchant contract check.

## Database and backend installation

The store's PostgreSQL migration is `prisma/migrations-postgresql/20261026000000_argent/migration.sql`. Apply it with the repository's existing migration process before enabling Argent:

```sh
node node_modules/prisma/build/index.js migrate deploy --config prisma/postgresql.config.ts
```

Local disposable SQLite databases use `prisma db push`; do not use `db push` against production. Both Prisma schemas have identical models. The new table stores one attempt per order, its provider IDs, mode, private continuation URL and refund state; it stores no card details.

Backend source changes are also present in the sibling `Avion backend` workspace. `docs/argent-backend.patch` includes the corresponding source/tests for review and application from the backend root. No backend database migration is needed.

The live back office needs its own private:

```dotenv
ARGENT_MODE=live
ARGENT_ALLOW_LIVE=true
ARGENT_SECRET_KEY=
ARGENT_COMPANY_ID=
```

It deliberately refuses test payments. `GET /api/v1/payments/argent` is a source-authenticated readiness check; `POST` to the same URL independently verifies the named source order. The existing source key is passed in `X-Avion-Key`, never a URL. No manual bank-transfer confirmation is accepted as card-payment evidence.

## Webhook and reconciliation worker

Configure the signed provider callback to:

```text
https://peptbay.com/api/checkout/webhook/argent
```

Schedule the storefront reconciliation endpoint at least once a minute using the existing authenticated scheduler pattern:

```text
GET https://peptbay.com/api/internal/argent-reconcile
Authorization: Bearer <CRON_SECRET>
```

Each run processes two saved intents in oldest-checked order; failed checks rotate to prevent starvation. Increase capacity or use a dedicated queue if merchant volume makes that interval insufficient. Provider events are mainly documented for MIT retries; real CIT/refund callback payloads and delivery behaviour still need confirmation. No merchant-initiated retries are enabled by this integration.

## Timeouts, declines and recovery

The provider does not document an idempotency key. Therefore neither intent creation nor refund POSTs automatically retry. An uncertain outcome is persisted as UNKNOWN and blocks another POST for that order. Do not delete the attempt or create a replacement charge until its provider outcome is established.

After locating the exact provider record privately in the merchant dashboard, a trusted operator can attach a verified record:

```sh
node node_modules/tsx/dist/cli.mjs scripts/argent-recover.ts payment ORDER_NUMBER INTENT_ID
node node_modules/tsx/dist/cli.mjs scripts/argent-recover.ts refund ORDER_NUMBER REFUND_ID
```

Recovery checks the saved reference, amount, merchant, currency and mode. It never creates another charge/refund. If a recovered draft does not expose its continuation token, use provider support/dashboard recovery; do not invent a checkout URL. A failed or uncertain attempt requires provider review before another payment attempt; there is no automatic new-intent retry UI.

Argent orders are excluded from generic local expiration/cancellation so a timer cannot release stock while a provider payment is in flight. Unstarted or declined stale orders currently need operator review; add provider-confirmed cancellation once Argent documents that contract. Fulfilled goods are not automatically restocked on refund. Partial refunds and chargeback event mapping need provider confirmation/manual reconciliation.

## Activation checklist

1. Obtain test merchant credentials, company ID, approved hosted origin and webhook signing secret.
2. Apply the store migration; install the backend code and readiness endpoint. Leave production card checkout disabled.
3. Configure a test environment, verify hosted amounts and return flow, and register signed webhooks. Verify success, decline, 3DS completion/cancel, pending state, browser refresh, duplicate clicks and callback replay.
4. Verify full/failed refunds, timeout recovery, wrong reference/amount/currency/merchant/mode, ownership checks and test isolation. Confirm actual wallet availability separately; this implementation does not manufacture wallet buttons or PCI/3DS certification badges.
5. Configure the reconciliation scheduler. For live activation, configure the independently verified backend first, then matching storefront credentials; set `ARGENT_MODE=live` and `ARGENT_ALLOW_LIVE=true` only for the approved live environment. Keep the checkout flag false until the merchant test checks pass.

No production database, payment configuration, order, charge, refund or postback has been changed by building this integration.

## Verification

113 storefront tests passed (one optional integration test skipped), all 46 backend database tests passed, and the isolated backend authentication checks passed. TypeScript and touched-file lint passed. Desktop and mobile browser checks covered guest ownership, server-priced pack totals, and ignored forged return parameters. Network and payment responses were fixtures; no real charge or refund was submitted.
