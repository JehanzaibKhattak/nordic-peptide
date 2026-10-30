# Respond.io fulfilment updates — 28 October 2026

The backend now has a tested respond.io channel driver and private packing-media links. It is installed in production with **WhatsApp sending disabled**. Existing Resend email remains enabled. No WhatsApp messages or contact records were created during verification, and no balance top-up was made.

## Implemented

- Fixed first-party API endpoint and channel ID 570416; bearer token is private server configuration.
- Existing transactional outbox handles payment-link, payment-confirmed, shipped and staff packing notifications. English (UK) Utility template names and ordered parameters are recorded in `respondio-templates.json`.
- Sending checks channel access and approved templates before creating a missing contact. Existing contact profiles are preserved. The sender explicitly selects the configured WhatsApp channel.
- Respond.io documents no send idempotency key. A durable `respond:pending` marker is saved before the API send. A recorded acceptance is reused on replay; ambiguous sends are held for reconciliation instead of blindly duplicated. Confirmed 429 rejections use the existing retry schedule. Provider errors omit response bodies and credentials.
- Growth-compatible delivery-status polling uses GET message status. It is bounded to approximately 10 seconds per worker pass with individual 4-second requests, then defers each checked message for 15 minutes. Only WhatsApp messages with this driver's provider IDs are updated. Growth does not include outbound Webhooks; no unverified webhook/signature scheme was invented.
- Shipped notifications include a signed, order-scoped packing-media link valid for 14 days. The gallery and downloads require a valid HMAC signature and expiry. Download queries are scoped to the order; files must resolve under that order's private proof directory and use an allowlisted media type. Responses are no-store/noindex/no-referrer. Files are not moved into public storage.
- Email continues attaching smaller proof files. If encoded attachments exceed its safe budget, email includes the private packing-media link instead. Large videos no longer have to be silently omitted or rejected solely due to email size. Missing/corrupt media still fails visibly.

These WhatsApp messages contain links to packing photos/videos; they do not attach every file directly in WhatsApp. Staff continue to upload media in the existing packing screen. Inbound conversations stay in respond.io; syncing STOP replies into Avion automatically is not implemented. Existing Avion channel opt-outs remain enforced, and no marketing sends were added.

## Verification

- All 42 existing backend tests passed against `avion_whatsapp_release_test`.
- Network-disabled driver checks passed for template payloads, accepted-send replay, uncertain-send protection, 429/permanent rejections, credential redaction and signed-link validation.
- Real-database fixture checks passed for paid order -> proof upload -> shipped template, no duplicate send, delivered status polling, signed gallery/download, invalid/cross-file/malformed request denial and oversized-email private-link fallback. HTTP calls in these checks were mocked; no real WhatsApp send occurred.
- Existing Resend driver regression checks passed. Targeted proof/database checks were repeated after final timeout and file guards.
- Actual read-only Respond.io API access succeeded. No required templates were approved at the final readiness check.

## Template status and remaining submission

The user authorized submission of all four Utility templates, including the form's WhatsApp Terms of Use acknowledgement.

| Template | Final observed state |
|---|---|
| peptbay_payment_confirmed | Submitted / processing |
| peptbay_order_shipped | Rejected: trailing variable too close to end |
| peptbay_order_shipped_v2 | Submitted / processing |
| peptbay_payment_link | Submitted / processing |
| peptbay_pack_order | Submitted / processing |

The corrected shipping draft adds a complete closing sentence after the last variable. The driver intentionally uses `peptbay_order_shipped_v2`, not the rejected draft. Browser control was restored on retry. All three outstanding templates were submitted using the manifest and synthetic sample values. The template list showed all four required templates Processing. The older rejected shipping draft is retained and is not used by the driver. Submission is not approval.

The channel still showed Unavailable with a low-funds warning. WABA Balance denied this user permission, so its actual amount and the cause of Unavailable were not verified. An Organization Admin/Billing Admin must check those account details. Top-up alone is not evidence that templates or channel permissions are ready.

## Deployment and activation

Production image: `localhost/avion-admin:whatsapp-20261028`, ID `a67fcabe3c6bd4c432d90acd89955ba0d31dadf958d1a71ec3ff0fa4de8a3474`. This overlays the prior email image with the reviewed driver, signed-media controller/helper, notifier/configuration, targeted public route, worker polling hook and readiness CLI. Unpublished payment/carrier changes from the local backend were not deployed.

Private environment variables: `AVION_RESPONDIO_TOKEN`, `AVION_RESPONDIO_CHANNEL_ID`, `AVION_PACKING_PROOF_SECRET`, `AVION_RESPONDIO_ENABLED=0`. The proof secret must be retained across deployments; rotating it invalidates outstanding packing links. API token and signing secret are confined to root-only server files and environment configuration.

Post-deployment checks: admin service and worker timer active, worker Result=success/ExecMainStatus=0, public login HTTP 200, unsigned packing-media URL HTTP 404, Resend still selected and WhatsApp still disabled. No production data migration was required. The same targeted changes were copied to the server source directory.

Before enabling: verify every expected template is approved via `php bin/respondio-check.php`, resolve Unavailable/balance/permissions, confirm a WhatsApp test recipient, then enable `AVION_RESPONDIO_ENABLED=1` and perform an authorized end-to-end phone delivery test. Review historical failed/pending messages rather than bulk retrying them. An uncertain `respond:pending` send requires checking respond.io before changing the marker or retrying. Provider acceptance is sent, not delivered; polling confirms later delivery status.

Rollback service/environment backups: `/etc/containers/systemd/avion-admin.container.pre-whatsapp-20261027235753` and `/opt/avion/env/admin.env.pre-whatsapp-20261027235753` (UTC filename). Stop the worker timer, restore backups, daemon-reload/restart the admin service, and restore the timer. Prior source files are in `/opt/avion/review/whatsapp-20261028/rollback-source`; remove the new files as needed before a later full-source rebuild. Never commit private environment backups.

References: [official SDK contracts](https://github.com/respond-io/typescript-sdk), [Developer API](https://respond.io/help/integrations/developer-api), [Webhooks plan requirement](https://respond.io/help/integrations/webhooks), [WhatsApp balance permissions](https://respond.io/help/organization-settings/whatsapp-fees).
