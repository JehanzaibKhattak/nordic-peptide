# ArgentPlatforms payment review

Initial review: 24 October 2026. The hosted integration was subsequently implemented and fixture-tested on 26 October; see [implementation and setup](argent-integration.md). No merchant credentials, real payment requests, webhook registration or live card activation have occurred.

Sources: client-supplied `ArgentPlatforms _ PaymentJS.pdf` (11 pages), https://api.argentplatforms.com/docs and its linked https://api.argentplatforms.com/schema/ OpenAPI document.

## What the provider documents

- PaymentJS loads from `https://js.argentplatforms.com/payment.min.js`, initializes with a publishable key and unique payment reference, and provides embedded cross-origin card fields or a hosted payment page.
- The SDK supports automatic 3-D Secure handling and optional Apple Pay/Google Pay buttons. Wallet availability must come from the SDK, not from showing payment logos.
- The SDK defaults to production; development must be selected explicitly with test credentials.
- Backend API calls use HTTPS and Basic authentication: the secret key is the username and the password is empty. Keep that key on the server.
- Payment intents have `draft`, `in_progress`, `pending`, `requires_action`, `completed`, and `failed` states. Only a verified `completed` payment can confirm an order.
- Webhooks use `X-ArgentPlatforms-Signature` with HMAC-SHA256 and a separate signing secret. Validate the original request bytes using constant-time comparison. The documentation's Python sample mixes a parsed dictionary with a bytes-based HMAC API; that example needs correction when implementing.
- Payment intent retrieval, payments and refunds are available through the API. Store both the intent ID and captured payment ID; the latter is needed for refunds.
- Merchant-initiated retry mode can schedule later attempts. It should remain off for Peptbay's one-time, customer-initiated checkout; do not create a fresh charge while an existing intent is pending.

## Peptbay integration boundaries

1. Keep bank transfer available while Argent is tested separately behind a disabled-by-default configuration flag.
2. Calculate totals, discounts, shipping and currency on the server. Bind a unique payment attempt to the internal order and retain its provider ID before accepting completion.
3. Use hosted/tokenized fields. Never send raw card details or CVV through Peptbay's order API, database, logs, analytics or Keitaro.
4. Treat browser callbacks and return-URL query parameters as notifications, not proof of payment. Retrieve the provider intent server-side and verify its reference, merchant context, live/test mode, currency, amount and captured payment against the saved order.
5. Reconcile verified success exactly once into the existing paid-order/backend/Keitaro queue. Declines, abandoned 3DS and pending payments must never trigger sale postbacks or fulfilment.
6. Authenticate webhook notifications and make processing idempotent. Because the shown events focus on merchant-initiated retries, confirm coverage for ordinary customer-initiated checkout and refunds; use provider retrieval for authoritative reconciliation.
7. Refund through the provider using the captured payment ID, then reconcile the confirmed result and rejection postback. Do not simply mark the local order refunded before the provider confirms it.

The current guest checkout is bank-transfer-only, and its backend synchronization endpoint only confirms GBP bank-transfer payments. Argent requires its own verified provider reconciliation path; it must not reuse that manual confirmation endpoint as proof of a card payment.

## Required before merchant testing/activation

- Approved merchant account, sandbox publishable key, sandbox server key and a private path for storing them.
- Confirmed GBP acceptance/settlement and the supported methods enabled for this merchant.
- Merchant-approved return URL and webhook endpoint, plus a webhook signing secret.
- Domain registration requirements for hosted checkout and wallet methods.

## Questions for Argent

- **Amount units:** PaymentJS examples use a string such as `"1999"`; the API uses decimal examples such as `123.00`. Confirm major/minor units for each interface and each supported currency.
- **Idempotency:** Confirm supported idempotency headers/keys, duplicate-reference behaviour, and the safe recovery procedure after a timeout. A unique `reference` is documented, but charge deduplication guarantees are not established by the reviewed material.
- **Server-bound intents:** Confirm whether PaymentJS can finish a server-created intent/session, or how to bind its browser-created intent to a server-authoritative amount and order before capture.
- **Webhook coverage/replay:** Confirm customer-initiated success/failure events, refund/chargeback events, delivery retries, event identifiers and timestamp/replay protection. The documented HMAC header alone does not establish a freshness window.
- **Response shape:** The OpenAPI intent detail declares `payment` as a string, while the API example and SDK guide describe a payment object containing an ID. Obtain an actual sandbox response contract.
- **SDK lifecycle/field names:** Confirm cleanup/unmount support for React navigation and the exact option names for express checkout and hosted branding. The PDF contains inconsistent spellings in its tables versus code examples.

## Sandbox acceptance checks

Successful card payment; decline; 3DS success/failure/cancel; wallet available/unavailable; double-click; network timeout/retry; page refresh; forged return URL; wrong amount/currency/reference; invalid and duplicate webhook; late success; failed and successful refund; test/live mismatch; exactly one backend sale postback and one confirmed reversal.

No live charge or refund should be used to establish these contracts.
