# Argent USD acceptance / decline test — 27 October 2026

The actual Argent test API and hosted page were exercised through the isolated storefront checkout. Production GBP checkout, production orders and live payment configuration were unchanged. Test keys were verified to create `live:false` intents. No real card, customer order, fulfilment action or affiliate postback was used.

## Requested confirmations

**Hosted page:** `https://pay.argentplatforms.com` was explicitly configured, sent in the create-intent request, returned by Argent, and observed in Chrome. Official PaymentJS calls its option `hostedPaymentPageUrl`; our server maps `ARGENT_HOSTED_PAYMENT_PAGE_URL` to the documented API field `hosted_payment_page_url`. Browser redirects also enforce the private HTTPS origin allowlist.

**Accepted:** order **NPS78238296**, **USD 7.90**, completed the checkout → hosted test card → automatic return flow. Without pressing Refresh, the shop displayed **Payment received** after retrieving the matching intent and captured payment. Database order status is `PAID`; intent is `completed`; capture ID is saved. The cart cleared. The earlier diagnostic success order NPS94885531 also verified correctly after the capture response-shape fix.

**Declined:** order **NPS48947328**, **USD 7.90**, used Argent's documented decline test card. Argent displayed its failure message on the hosted page. Returning to the shop receipt retrieved the saved intent and displayed **Payment declined**, with an unpaid order and no fulfilment acceptance. Database order status remains `PENDING`, provider status is `failed`, and no capture ID exists. A durable `argent.failed` event is recorded once. Argent does not automatically redirect on this hosted decline; the verified receipt/status endpoint still communicates it to the shop.

Evidence metadata (no credentials, receipt tokens or customer details): `docs/argent-usd-test-results-20261027.json`.

## Fixes established by real-provider testing

- Hosted intent creation with `can_handle_3ds:true` requires `browser_info`. The browser now collects the same fields as official PaymentJS and the server validates/bounds them before sending the request.
- Captured payment responses return `payment_intent` as an object with an `id`; string references remain supported. Both storefront and independent backend verification now bind either shape to the saved intent, rejecting mismatches.
- `ARGENT_TEST_CURRENCY=USD` enables a configured isolated test checkout. Live mode still requires GBP; this does not enable live USD/EUR processing. The GBP-specific RETA campaign is not converted into USD or given invented discounts.
- Verified failures have an idempotent audit event and a clear unpaid/declined receipt. A failed browser return parameter alone cannot mark an order paid.

## Validation and limits

117 automated storefront tests passed, with one optional integration test skipped. TypeScript, lint and the production build passed. The network-disabled backend contract test accepts the observed nested payment-intent binding and rejects a foreign intent.

Real provider success and decline were tested; receipt rechecks read actual provider status. Tests use a copied SQLite database and test-only sample prices. The paid confirmation email was rendered locally with the Resend key empty; no customer email or WhatsApp message was delivered. There are no `avion.pending` events for these test orders and test fulfilment remains blocked.

A public staging webhook delivery and deployed scheduler have not been verified in this run. The independent live back-office confirmation path remains fixture-tested, not exercised with test money against production fulfilment. GBP/live merchant acceptance, live deployment, refunds/chargebacks, and WhatsApp/email delivery are not claimed by these USD success/decline results.

## Sources

- https://api.argentplatforms.com/schema/ — intent browser info, hosted URL, payment records and test cards
- https://js.argentplatforms.com/payment.min.js — `hostedPaymentPageUrl` mapping and browser metadata
- Client-supplied PaymentJS guide
