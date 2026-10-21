# Guest bank-transfer checkout

The owner requested live UK guest checkout on 21 October 2026. This path accepts configured GBP bank transfers using the existing displayed GBP rate (0.8472 GBP per EUR). It uses active catalogue prices and available stock, and does not require a research-account application. Existing account and Stripe approval checks remain in place for other payment methods.

Activate with NEXT_PUBLIC_BROWSE_ONLY=false, NEXT_PUBLIC_DEMO_CHECKOUT=false and NEXT_PUBLIC_AVION_CHECKOUT=true at build and runtime, plus GUEST_BANK_TRANSFER_ENABLED=true and complete BANK_TRANSFER_* configuration at runtime. Bank details stay in the server environment, never Git. Guest receipts require the encrypted HttpOnly checkout cookie; an order number or checkout UUID alone cannot reveal an order.

Orders reserve stock, remain PENDING, carry their reference and GBP total to Avion, and email payment instructions with a 48-hour deadline. No bank API is connected. Staff must verify the actual bank receipt before using Mark paid in the storefront order admin and confirming payment in Avion before fulfilment. The two administrative payment states are not automatically synchronized. Overdue bank orders are held for staff review rather than automatically releasing stock; the receipt hides payment instructions after the deadline. Do not treat an uploaded receipt or customer assertion as payment confirmation.

Production stock was zero for all eleven variants at launch preparation. No quantities were invented. Set confirmed available quantities before accepting sales.

The owner subsequently authorized offline inventory management. NEXT_PUBLIC_INVENTORY_MODE=offline skips bank-transfer stock checks and reservations. Each affected order records inventory.offline so cancellation, expiration and refunds do not add unreserved quantities. Existing orders retain their original reservation behavior even if the mode changes. Active-product, quantity, price and shipping checks remain enforced.
