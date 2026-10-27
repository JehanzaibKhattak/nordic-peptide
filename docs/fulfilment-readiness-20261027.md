# Fulfilment readiness — 27 October 2026

## Checkout change

Shipping phone is required in the standard checkout and embedded RETA checkout, with a WhatsApp icon and transactional order/delivery update explanation. Marketing permission is separate. The API rejects a missing or malformed shipping phone; billing phone remains optional. Existing orders are unchanged. Basic number formatting is checked; WhatsApp availability is not assumed.

## Verified production configuration

Only allowlisted driver class names were read from the deployed backend. Both WhatsApp and email resolve to `Avion\Messaging\LogChannel`; shipping resolves to `Avion\Shipping\NullCarrier`. In production LogChannel fails with “Messaging provider is not configured”; it does not send customer messages.

Packing proof upload and tracking validation are implemented in `Order::submitProof`. `Notifier::shipped` queues email and WhatsApp tracking text. It currently does not include proof media. Royal Mail tracking URLs/validation remain carrier-specific. Parcel2Go is not connected.

Required to finish actual delivery: select/authorize the WhatsApp Business sending provider, provide its private credentials and approved transactional templates, connect the email channel, add secure customer proof-media delivery, and verify delivery with designated test recipients. No customer or operations messages were sent during this audit.

## Parcel2Go

The user-designated private file contains website login credentials, not OAuth API client credentials. Official docs require a Client ID and Client Secret from My Account → API; sandbox credentials are separate. Do not use login passwords as API secrets. No labels, orders or postage purchases were made.

References: https://sandbox.parcel2go.com/api/docs/articles/intro.html and https://sandbox.parcel2go.com/api/docs/articles/endpoints.html

## WhatsApp direction

The user selected Meta API and already has respond.io. Use respond.io as the staff inbox and its Developer API as the backend transport, pending workspace access, plan entitlement, connected Channel ID and approved utility/media templates. Official docs: https://respond.io/help/integrations/developer-api and https://respond.io/help/whatsapp/whatsapp-cloud-api . Developer API requires Growth or above. No respond.io messages or workspace changes have been made.

## Validation

116 storefront tests passed; one optional integration test skipped. TypeScript, touched-file lint and production build passed. At 1440px and 390px the checkout blocks missing/invalid phone numbers, accepts a formatted international number, displays the WhatsApp note, and has no horizontal overflow. No order was submitted. These checkout changes are reviewable code and have not yet been deployed.
