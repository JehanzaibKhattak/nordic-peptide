# Fulfilment email connection — 27 October 2026

The storefront already had Resend configured. The separate Avion fulfilment worker still used LogChannel for email. `fulfilment-email-backend.patch` adds a Resend driver to that existing worker; default sending remains disabled until an inbox test is confirmed.

The shipped notification snapshots this order's packing-media paths and hashes. The driver sends tracking text and photo/video attachments, checks files remain inside the order's private proof directory, and rejects missing, modified or oversized media. Files are not made public. Encoded attachments are capped at 36 MiB, leaving overhead below Resend's 40 MB email limit. Larger videos need smaller uploads; they are not silently omitted.

The provider request uses a stable hashed idempotency key. Permanent rejections fail visibly; rate limits, network failures and server errors use the existing outbox retry schedule. Errors omit provider response bodies and credentials. Provider acceptance is recorded as sent, not delivered.

## Verification

- Network-disabled PHP checks: payload, media isolation/hash/size, notifier media snapshot, retries, redaction and stable idempotency.
- Real Resend simulator: accepted a synthetic packing email with a PNG attachment using the existing sender. Provider ID `01a17e7a-4623-71df-9829-c49e5c138ec6`.
- Existing key cannot retrieve email status (HTTP 401). Inbox delivery has not been verified.
- No production email outbox rows existed at the readiness check.
- No customer email, real order, shipment, postage purchase or live payment was created.

## Activation

Use private backend environment values `AVION_RESEND_API_KEY`, `AVION_EMAIL_FROM`, and `AVION_RESEND_ENABLED=1` after deploying the reviewed PHP patch. Preserve the configured sender's full display name and address. Existing config.local.php channel overrides take precedence and must be checked. Do not put keys in source or browser JavaScript.

The credentials were copied directly between root-only server files for the isolated provider check. The active backend configuration and image have not been changed. A designated test recipient is still needed for a real inbox check before enabling customer delivery. No delivered/bounced webhook integration is included in this change.

Provider references: [send email](https://resend.com/docs/api-reference/emails/send-email), [official delivery simulator](https://resend.com/docs/dashboard/emails/send-test-emails).
