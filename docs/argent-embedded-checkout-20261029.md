# Embedded card checkout — 29 October 2026

The payment page keeps card entry on Peptbay using Argent's official PaymentJS embedded fields. It displays the saved products, quantities, subtotal, discount, delivery, tax, GBP total and delivery address. No card number or CVC is handled by the storefront server.

The server still creates and durably binds exactly one priced intent per order. The client continues that existing intent with the public key and continuation token; no browser amount, currency or reference is passed to the SDK. Existing hosted intents can therefore continue in embedded fields without replacing a payment attempt. Success callbacks trigger server-side retrieval and independent backend verification rather than marking an order paid. Submit is locked once attempted; uncertain outcomes require status checking. Refresh retains the server's existing attempt. An issuer's authentication challenge may still appear.

Current official SDK and schema were inspected directly:
- https://js.argentplatforms.com/payment.min.js
- https://api.argentplatforms.com/schema/

## Actual-provider tests

A copied local SQLite database, synthetic customer data and Argent test keys were used. Both tests remained on the Peptbay local payment page, including provider card entry and result.

- Success: EMBEDDED-b86dad9749, USD 7.90, intent pymint_cmvtegp9900di1ro7vdthn34t. Provider completed, store PAID after verification, live false.
- Decline: EMBEDDED-DECLINE-a1e8fcfc, USD 7.90, intent pymint_cmvteju5z00e41ro75biz4qbg. Provider failed, store PENDING/unpaid, live false.
- Both tests created zero Avion fulfilment events. Resend credentials were empty; no customer messages or live charges were submitted.
- Unit tests cover rejecting foreign/credentialed/missing continuation URLs and passing only an existing intent/public continuation credentials. Existing pricing, ownership, duplicate-attempt and reconciliation tests remain in place.

The local fixture route and database are untracked development-only files; they are excluded from the Git archive used for deployment. They are not production routes.

A controlled real cardholder GBP purchase, issuer 3DS challenge, refunds and production paid-order handoff remain acceptance checks; these are not claimed by the test-mode results.

## Production deployment

- Deployed code `faa4c98` in image `localhost/avion-store:argent-embedded-20261029` (image ID `069977f0b59326e92e25be50e051701d8700729720591449cf532df3570f3dbc`).
- Preview checks passed: RETA HTTP 200 with updated copy, untracked fixture route absent (404), private payment URL rejected without a valid owned session (404).
- Rollback snapshot: `/opt/avion/review/argent-embedded-20261029/rollback-20261029104046`.
- Running image and mirrored source files independently verified after activation. Reconciliation service returned success/exit 0 on the new image.
- Live RETA browser shows the on-Peptbay payment wording. Existing live credentials, GBP totals, backend, database and bank transfer were unchanged by this UI release.
- Full suite: 118 passed, one optional integration test skipped. Touched-file lint, TypeScript and production build passed.
- The real cardholder's production GBP transaction and issuer authentication remain untested. No live card data was entered and no live charge was submitted in this change.
