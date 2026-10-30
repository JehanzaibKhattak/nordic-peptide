# Real payment failure investigation — 30 October 2026

## Provider evidence

Order `NPS29633349`, GBP 209.00, maps to backend order `AV-10011` (ID 11).
Argent intent `pymint_cmvusgp6c03ft1ro72byjcp84` was created at
09:47:36 UTC and updated to `failed` at 09:48:23 UTC.

The authenticated provider response reports `live: true`, `payment: null`,
`merchant_processor: null` and `latest_payment_attempt: null`. Argent's live
Failed Transactions screen lists this order, but its reason is `-`; expanded
processor, error code and attempt details are empty. No issuer decline reason
or successful capture can be established from these records. No new intent or
charge was submitted during this investigation.

Argent support needs to trace that intent and confirm live GBP processor
routing and the underlying failure reason. Do not describe this as a confirmed
bank decline or promise that no pending bank authorization exists.

## Missing backend log

The storefront had already saved its idempotent `argent.failed` order event.
Avion had the synced order in the `unpaid` bucket with `paid_at: null`, but its
history contained only the order-created entry. The reconciliation code synced
only successful captures and refunds to Avion.

The fix adds a `failed` reconciliation event through the existing source-key
protected endpoint. Avion independently retrieves the intent and validates its
live mode, merchant, GBP total, order reference, failed status and absence of a
captured payment. An order lock prevents duplicate history entries. Paid orders
and bank-transfer orders are rejected. A verified failure adds history/audit
entries without changing the unpaid bucket or sending fulfilment, payment
emails or affiliate conversions. The storefront keeps the known failure visible
if Avion is unavailable; its existing reconciliation worker retries logging.

No database migration or credential change is required. Backend changes are
limited to `src/ArgentPayments.php` and `src/Controllers/IntakeController.php`;
regression coverage is in `tests/run.php` in the backend workspace.

## Validation

- Frontend: 121 unit tests passed, one optional test skipped; TypeScript and
  targeted ESLint passed.
- Backend: five Argent integration tests and the capture-binding contract test
  passed in an isolated disposable MariaDB database, with no production
  credentials. Failure tests cover replay, mismatched/test/completed/captured
  intents, already-paid orders, and no fulfilment/messages/conversions.
- Both Next.js bundlers failed parsing the external Montserrat font response.
  The exact five public WOFF2 assets already served by the live build are now
  bundled with their existing weight/subset rules and official OFL license.
  The normal Turbopack build is retained; no font designs were substituted.

## Production result

Deployed both `localhost/avion-store:argent-failure-20261030` and
`localhost/avion-admin:argent-failure-20261030` after preview health checks.
Rollback units/source copies are under
`/opt/avion/review/argent-failure-20261030/rollback-20261030103332`.
The source/build context is `/opt/avion/review/argent-failure-20261030`.

The existing failed intent was independently reconciled into backend order 11.
Two identical requests returned success, with exactly one `argent_failed`
history entry afterward. The order remains `bucket: unpaid`, `paid_at: null`,
with zero affiliate postback rows. Both payment reconciliation and normal
backend worker timers remain active. Public storefront and original local
font asset returned HTTP 200; private payment-page ownership checks and
absence of development fixture routes passed. Chrome verified the live page
renders with the bundled Montserrat family.

The underlying provider failure remains unresolved pending Argent's trace.
No new payment intent, charge retry, refund, postage booking or customer
message was performed.
