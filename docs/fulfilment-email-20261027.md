# Fulfilment email connection — 27 October 2026

The storefront already had Resend configured. The separate Avion fulfilment worker still used LogChannel for email. `fulfilment-email-backend.patch` adds a Resend driver to that existing worker. After the authorized inbox test was received, production sending was enabled on 27 October 2026. Source defaults remain disabled unless explicitly configured.

The shipped notification snapshots this order's packing-media paths and hashes. The driver sends tracking text and photo/video attachments, checks files remain inside the order's private proof directory, and rejects missing, modified or oversized media. Files are not made public. Encoded attachments are capped at 36 MiB, leaving overhead below Resend's 40 MB email limit. Larger videos need smaller uploads; they are not silently omitted.

The provider request uses a stable hashed idempotency key. Permanent rejections fail visibly; rate limits, network failures and server errors use the existing outbox retry schedule. Errors omit provider response bodies and credentials. Provider acceptance is recorded as sent, not delivered.

## Verification

- Network-disabled PHP checks: payload, media isolation/hash/size, notifier media snapshot, retries, redaction and stable idempotency.
- Real Resend simulator: accepted a synthetic packing email with a PNG attachment using the existing sender. Provider ID `01a17e7a-4623-71df-9829-c49e5c138ec6`.
- Existing key cannot retrieve email status (HTTP 401). The user supplied a Gmail screenshot confirming inbox receipt from orders@peptbay.com with an attachment after the authorized direct test (provider ID `01a17e7d-13aa-7c6d-b912-a4c80a2dbdff`). This is evidence for that test email, not delivery receipts for future emails.
- Exact release image: all 42 existing backend database tests passed in the isolated `avion_email_release_test` database.
- Full synthetic order -> paid -> packing image upload -> shipped -> transactional outbox -> Resend check passed. Provider ID `01a17e86-3273-7471-ac99-cf3c838e0b36`; the outbox saved sent status and provider ID, notified_at was set, and repeated packing did not queue a duplicate. A visible 640x360 synthetic package image was attached. This second email used the same authorized test inbox; inbox receipt of this particular email has not been independently checked.
- No production email outbox rows existed at the readiness check.
- No customer email, real order, shipment, postage purchase or live payment was created during verification. Production now sends future eligible packing notifications.

## Activation

Use private backend environment values `AVION_RESEND_API_KEY`, `AVION_EMAIL_FROM`, and `AVION_RESEND_ENABLED=1` after deploying the reviewed PHP patch. Preserve the configured sender's full display name and address. Existing config.local.php channel overrides take precedence and must be checked. Do not put keys in source or browser JavaScript.

The credentials were copied directly between root-only server files. Production backend image `localhost/avion-admin:email-20261027` is based on the previously running `localhost/avion-admin:20261014`, with only ResendChannel.php, Notifier.php and config.php overlaid. Image ID: `6d64032e86450f5801935e8541f0c9b58b5bed9b7545761b317802d169a9e2fc`.

Activation checked that no queued/sending email rows existed, saved private environment and service backups, briefly stopped the minute worker, restarted the backend, verified HTTP 200 and the loaded Resend driver/credentials, and restored the worker timer. Post-deploy public login HTTP 200, worker Result=success/ExecMainStatus=0 and active timer were confirmed. The existing source directory received the same three reviewed files. No WhatsApp, payment, carrier or storefront configuration was changed.

Rollback: restore `/etc/containers/systemd/avion-admin.container.pre-email-20261027180226` and `/opt/avion/env/admin.env.pre-email-20261027180226`, reload systemd and restart avion-admin.service, then restore the worker timer. Those private backups must never be committed. Restore the two pre-email source files as well before any later full-source rebuild.

No delivered/bounced webhook integration is included: provider acceptance means sent, not guaranteed delivery. Packing proof larger than the bounded attachment budget fails visibly and requires smaller media. The original proof upload limit is larger than the email attachment limit; no public media sharing endpoint was added.

Provider references: [send email](https://resend.com/docs/api-reference/emails/send-email), [official delivery simulator](https://resend.com/docs/dashboard/emails/send-test-emails).
