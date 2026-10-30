# Argent live GBP activation — 28 October 2026

Card checkout is enabled on peptbay.com alongside existing bank transfer. This records deployment and readiness, not a completed live card charge.

## Verified

- Live public/secret keys authenticated with the official Payments API (HTTP 200).
- One explicitly approved synthetic GBP 1.00 hosted draft intent returned HTTP 201, `live:true`, currency GBP and `https://pay.argentplatforms.com`. Merchant: Ace Consumer Essentials Ltd, company ID `cmp_cmvp3vgn7032q1rr01m1oriah`. Intent `pymint_cmvscbnlx02h61op72ic2tx6s`. No card, charge, shop order, fulfilment or customer message was submitted.
- 117 storefront tests passed; one optional integration test skipped. Production build and TypeScript passed. Network-disabled backend capture binding/mismatch rejection test passed.
- PostgreSQL was backed up before the additive `20261026000000_argent` migration; migration applied successfully.
- The independent backend readiness endpoint returned configured with the expected company ID.
- RETA browser checkout displayed Card — secure Argent checkout and Bank Transfer / Wire. Selecting card retained the server pack price GBP 313.50 for 2 × 20 mg pens. Mandatory phone and WhatsApp notice remain present. No Terms acceptance or Place order action was performed.
- Reconciliation endpoint ran successfully with zero attempts. The minute timer completed a subsequent scheduled run successfully. Existing backend worker remains active.

## Deployed

Code source: `6f43fd3` (tested Argent stack plus current WhatsApp icon fix).

- Store image: `localhost/avion-store:argent-live-20261028`
- Backend image: `localhost/avion-admin:argent-live-20261028`, layered over the existing WhatsApp/email image; only four Argent backend files replaced/added.
- Timer: `avion-argent-reconcile.timer`; service calls the authenticated endpoint from inside the storefront container without exposing its secret in the service definition.
- Release: `/opt/avion/review/argent-live-20261028`
- Rollback configuration and PostgreSQL dump: `/opt/avion/review/argent-live-20261028/rollback-20261028165047`
- Activation script: release directory `activate-argent-live.py`.

Credentials are private server environment settings, never public build variables. Existing production flags, email and WhatsApp configuration were preserved. The live token has Payments View and Payment Intents View & Manage; all other scopes, including Refunds, are disabled.

## Remaining acceptance checks and limits

A real cardholder must complete the final controlled live purchase. Live capture, 3DS and paid-order handoff/notifications have not yet been exercised against production. Prior actual-provider success/decline tests were isolated USD test-mode flows.

The dashboard's webhook creation form exposed MIT success/failure/attempt-failure and refund events, not ordinary customer-initiated card events. No provider webhook was registered. Receipt retrieval and scheduled provider reconciliation verify card status; the webhook endpoint rejects unauthenticated input. Do not claim webhook delivery has been verified. Confirm customer-initiated callback support with Argent before relying on it.

No live refund capability is enabled by the token scopes, and no refund or chargeback flow was tested. Funds were not charged or refunded by this activation. Parcel2Go bookings and WhatsApp channel activation are separate tasks.
