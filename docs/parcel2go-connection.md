# Parcel2Go connection — 27 October 2026

## Verified with the real account

OAuth client-credentials authentication returned HTTP 200, Bearer token, 7200-second lifetime, and `public-api` scope. The official anonymous UK-to-UK quote example returned HTTP 200 and 40 service quotes. The same checks passed from a disposable PHP backend container on the production host, using the new backend helper and an explicit `Peptbay-Avion/1.0` API client identity.

The earlier Python urllib request was rejected by Cloudflare 1010; standard curl and the PHP cURL client succeeded. No browser fingerprint spoofing, proxy or security challenge bypass was used.

No customer addresses or order data were used in the quote. No shipment was created and no postage was paid. The account credentials are live, not sandbox credentials. No `payment` scope is requested by this connection helper.

## Backend helper

The sibling backend workspace contains:

- `src/Shipping/Parcel2Go.php`: fixed live/sandbox HTTPS hosts, cached short-lived OAuth token, anonymous GB-to-GB quotes, numeric input validation, and safe error messages. It has no order creation or payment endpoint.
- `bin/parcel2go-check.php`: CLI diagnostic; prints connection state and quote count, never credentials or tokens.
- `tests/parcel2go.php`: dependency-free tests for authentication, token reuse, quote payload/host binding, invalid measurements, and redacted error handling.

The portable source patch is `docs/parcel2go-backend.patch`. Apply it from the backend repository root, then run the PHP test. No database migration is required.

The private source credentials remain in the user-designated `credentials.md` outside the storefront repo. A protected server copy is stored at `/opt/avion/env/parcel2go-private.json` with owner-only permissions. The file contains `mode`, `client_id`, and `client_secret`. No credentials are included in this document, the patch, or Git.

The reviewed helper files are on the server under `/opt/avion/review/parcel2go-20261027`. They were mounted read-only into a disposable backend image for the real API check. Running production web/worker containers were not changed or restarted, and the shipping carrier was not switched.

After installing the patch in the backend release and mounting the protected credential file into its CLI container:

```sh
php bin/parcel2go-check.php /run/parcel2go-private.json --quote
```

The sample is 1 kg, 20 × 15 × 10 cm, declared value GBP 100. These are documentation-test values, not the store's actual packing specifications. They must never be copied into real bookings by default.

## Remaining before real shipment booking

Confirm the actual collection address, contact, package weights/dimensions, dispatch timing and courier/service preference. The user has been asked for these details. Confirm the selected carrier accepts the actual research products and packaging; API quote success alone is not approval of contents.

Booking must preserve the chosen service, exact quote and payment outcome, avoid repeating uncertain order/payment requests, save the Parcel2Go references/label/tracking URL, and update tracking notifications for that carrier. Existing Royal Mail URLs must not be reused for unrelated couriers. Any postage purchase needs the actual booking details and authorized spending scope.

Packing photo/video delivery and respond.io WhatsApp/email activation are separate pending work; this successful API connection does not demonstrate those notifications work.

## Sources

- https://sandbox.parcel2go.com/api/docs/articles/intro.html
- https://sandbox.parcel2go.com/api/docs/articles/quickstart.html
- https://sandbox.parcel2go.com/api/docs/articles/orders.html
- https://www.parcel2go.com/prohibited-items
