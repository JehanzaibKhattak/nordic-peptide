import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Markdown } from "@/components/store/markdown";
import { getSettings } from "@/lib/settings";

const PAGES = ["terms", "privacy", "shipping", "refunds", "cookies"] as const;
type Page = (typeof PAGES)[number];

// Generic, non-fabricated legal copy. Replace with counsel-reviewed text before launch.
const CONTENT: Record<Page, (entity: string) => string> = {
  terms: (e) => `## Terms of Sale

These terms apply to purchases made from ${e} ("we", "us") through this website.

### Products
All products are cosmetics intended for external use. Product descriptions, ingredient lists and usage instructions are provided on each product page. Always read the label before use.

### Orders and payment
An order is placed when you complete payment. Prices are shown in EUR and charged in EUR; any conversion shown in another currency is indicative. Stock is reserved for a limited time during checkout; if payment is not completed within that window the order is released.

### Delivery
Delivery estimates are shown at checkout and are not guaranteed. Risk passes to you on delivery.

### Cancellation and returns
Consumers in the EU and UK have a statutory 14-day right to cancel. We additionally accept returns of unopened products within 30 days of delivery. See Returns & Refunds.

### Liability
Nothing in these terms limits liability that cannot be limited by law. Products are not medicines and make no medical claims.

### Governing law
These terms are governed by the laws of England and Wales, without affecting your statutory rights in your country of residence.`,

  privacy: (e) => `## Privacy Policy

${e} is the data controller for personal data collected through this website.

### What we collect
Contact and delivery details you enter at checkout; order history; technical data such as IP address and device information; and, with your consent, analytics data.

### Why we use it
To fulfil orders, provide customer support, meet legal and tax obligations, prevent fraud and, with consent, to understand how the site is used.

### Affiliate attribution
If you arrive via a partner link we store a first-party cookie for 30 days so the partner can be credited for a resulting order. It contains a campaign identifier, not your personal data.

### Sharing
We share data with service providers needed to run the store: payment processors, delivery carriers, email providers and hosting. We do not sell personal data.

### Your rights
You can request access to, correction of, or deletion of your personal data, and object to or restrict processing. Contact us via the Contact page.

### Retention
Order records are kept for the period required by tax law. Marketing and analytics data are kept no longer than necessary.`,

  shipping: () => `## Shipping

Orders placed before 16:00 CET on business days are dispatched the same day.

| Zone | Standard | Express | Free standard shipping from |
|---|---|---|---|
| European Union | 2–4 business days · €5.90 | 1–2 business days · €12.90 | €75 |
| United Kingdom | 3–5 business days · €6.90 | 1–3 business days · €14.90 | €85 |
| Switzerland & Norway | 3–6 business days · €8.90 | 2–3 business days · €16.90 | €95 |
| Rest of world | 6–12 business days · €14.90 | 3–6 business days · €29.90 | €150 |

All parcels are tracked. Orders outside the EU may be subject to import duties and taxes payable by the recipient. Packaging is plain and recyclable.`,

  refunds: () => `## Returns & Refunds

### 30-day returns
Unopened, unused products in their original packaging can be returned within 30 days of delivery for a full refund of the product price.

### Opened products
For hygiene reasons we cannot accept returns of opened cosmetics unless they are faulty.

### Faulty or damaged items
If a product arrives damaged or is faulty, contact us within 14 days with a photo and your order number and we will replace it or refund you, including return shipping.

### How to return
Contact us with your order number to receive a returns reference and address. Refunds are issued to the original payment method within 14 days of receiving the return.`,

  cookies: () => `## Cookie Policy

### Necessary cookies
Used to run the store: your cart, your ship-to country and language, checkout session and admin login. These cannot be switched off.

### Affiliate attribution
A first-party cookie (\`kt_attr\`, 30 days) records the partner campaign that referred you, so the partner can be credited if you order.

### Analytics
With your consent we load Google Tag Manager to measure how the site is used. You can withdraw consent at any time by clearing your browser storage for this site.`,
};

type Props = { params: Promise<{ locale: string; page: string }> };

export function generateStaticParams() {
  return PAGES.map((page) => ({ page }));
}

export async function generateMetadata({ params }: Props) {
  const { page } = await params;
  if (!PAGES.includes(page as Page)) return {};
  const t = await getTranslations("legal");
  return { title: t(page as Page) };
}

export default async function LegalPage({ params }: Props) {
  const { locale, page } = await params;
  setRequestLocale(locale);
  if (!PAGES.includes(page as Page)) notFound();
  const settings = await getSettings();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Markdown className="text-base [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:py-2 [&_th]:py-2 [&_th]:text-left">{CONTENT[page as Page](settings.legalEntityName)}</Markdown>
    </div>
  );
}
