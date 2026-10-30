# Product photography update — 30 October 2026

Source: client-supplied Google Drive folder `1cTb7Sf2U4pAfUY9-7pX0Sm19OvHZ9FB3`
(`New Version 28102026`). All 60 original JPEGs were retained unchanged in
`public/products/20261028`, in source order 1–6.

| Source folder | SKU | Gallery |
| --- | --- | --- |
| GHK-CU PRO 100mg | GHK100 | ghk-cu-100mg |
| GROW PRO 70mg (packaging reads GLOW) | GLOW70 | glow-70mg |
| KLOW 80mg | KLOW80 | klow-80mg |
| MOTS PRO 20mg | MOTSC20 | mots-c-20mg |
| MT2 PRO 20mg | MELII20 | melanotan-ii-20mg |
| RETA PRO 20mg | RET20 | retatrutide-20mg |
| RETA PRO 40mg | RET40 | retatrutide-40mg |
| TIRZEP RPO 40mg | TIR40 | tirzepatide-40mg |
| TIRZEP RPO 60mg | TIR60 | tirzepatide-60mg |
| WOLVERINE PRO 40mg | BPC20TB20 | bpc157-tb500-40mg |

The client provided no BPC-157 10 mg replacement, so its image is retained.
Product/variant image arrays use the new sets, replacing the older hardcoded
v2 overrides. The homepage and RETA campaign image also use the new photography.
Eight live Product.image arrays were updated for future order snapshots; prices,
stock, descriptions, existing order snapshots and payment configuration were
not changed. Variant images continue to come from the bundled catalogue.

The deployment uses the isolated image-update commit `6dc5afe`, based on the
last deployed storefront. Unrelated local modifications in the primary working
copy were not deployed; image-only edits were mirrored locally while preserving
other fields.

Validation: all ten galleries have six valid image references; TypeScript,
targeted ESLint and the production build passed. Preview checks verified all
60 original images byte-for-byte over HTTP, eight product pages, homepage,
RETA campaign page, and private payment-page ownership protection. Live Chrome
checks verified six thumbnails, gallery navigation, RETA 20→40 mg image switching,
and TIRZEP 40→60 mg image switching plus photo 6.

Live image: `localhost/avion-store:product-images-20261030`.
Release: `/opt/avion/review/product-images-20261030`.
Rollback: `/opt/avion/review/product-images-20261030/rollback-20261030130955`,
including previous Product.images values and storefront unit/source copies.
No messages were sent and no checkout order or payment was created.
