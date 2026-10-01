import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, FlaskConical, ShieldCheck, Timer, Truck, Star } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/product-grid";
import { StatsStrip } from "@/components/store/stats-strip";
import { FaqAccordion } from "@/components/store/faq-accordion";
import { JsonLd } from "@/components/store/json-ld";
import { getCategories, getProducts } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { toCard } from "@/lib/card";

const HOME_FAQS = {
  en: [
    { q: "Are your products cosmetics or medicines?", a: "Cosmetics. They're designed to improve the look and feel of skin and are regulated under EU and UK cosmetics law. They are not medicines." },
    { q: "Where are the products made?", a: "Formulated and filled in the EU under ISO 22716 (cosmetic GMP)." },
    { q: "Do you publish test results?", a: "Yes. Every batch has a lab report in our Batch Testing library, searchable by the number on your box." },
    { q: "How fast is delivery?", a: "Orders placed before 16:00 CET on weekdays ship the same day. EU standard delivery is 2–4 business days; UK 3–5." },
    { q: "Can I return a product?", a: "Unopened products can be returned within 30 days. See Returns & Refunds for details." },
    { q: "Are the formulas vegan and cruelty-free?", a: "Yes. No animal-derived ingredients and no animal testing." },
    { q: "Which product should I start with?", a: "The Starter Routine bundle: a peptide serum plus a daily cream that work together." },
    { q: "Do you ship outside the EU and UK?", a: "Yes — Switzerland, Norway, the US, Canada, Australia and the UAE. Duties may apply on arrival." },
  ],
  es: [
    { q: "¿Vuestros productos son cosméticos o medicamentos?", a: "Cosméticos. Están diseñados para mejorar el aspecto y la sensación de la piel y se regulan bajo la legislación cosmética de la UE y el Reino Unido. No son medicamentos." },
    { q: "¿Dónde se fabrican?", a: "Formulados y envasados en la UE bajo ISO 22716 (BPF cosméticas)." },
    { q: "¿Publicáis los resultados de los análisis?", a: "Sí. Cada lote tiene un informe de laboratorio en nuestra biblioteca de Análisis de Lotes, buscable por el número de tu caja." },
    { q: "¿Cuánto tarda la entrega?", a: "Los pedidos antes de las 16:00 CET en días laborables salen el mismo día. Entrega estándar en la UE: 2–4 días laborables; Reino Unido 3–5." },
    { q: "¿Puedo devolver un producto?", a: "Los productos sin abrir pueden devolverse en 30 días. Consulta Devoluciones y Reembolsos." },
    { q: "¿Son fórmulas veganas y sin crueldad?", a: "Sí. Sin ingredientes de origen animal y sin pruebas en animales." },
    { q: "¿Con qué producto empiezo?", a: "El pack Rutina Inicial: un sérum de péptidos más una crema diaria que trabajan juntos." },
    { q: "¿Enviáis fuera de la UE y el Reino Unido?", a: "Sí: Suiza, Noruega, EE. UU., Canadá, Australia y EAU. Pueden aplicarse aranceles a la llegada." },
  ],
};

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, categories, products, settings] = await Promise.all([getTranslations(), getCategories(), getProducts(), getSettings()]);
  const faqs = HOME_FAQS[locale as "en" | "es"] ?? HOME_FAQS.en;
  const cats = categories.map((c) => ({ slug: c.slug, name: c.name as Record<string, string> }));
  const cards = products.map(toCard);

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-sage/40 to-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <h1 className="whitespace-pre-line text-4xl font-semibold tracking-tight sm:text-5xl">{t("home.heroTitle")}</h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">{t("home.heroSub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" render={<Link href="/shop" />}>{t("home.ctaPrimary")}</Button>
              <Button size="lg" variant="outline" render={<Link href="/testing" />}>{t("home.ctaSecondary")}</Button>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs">
              <span className="flex text-amber-500">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="size-3.5 fill-current" />)}</span>
              <span className="font-medium">{settings.reviewsSource}</span>
              <span className="text-muted-foreground">{t("home.reviews", { rating: settings.reviewsRating, count: settings.reviewsCount.toLocaleString(locale) })}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {cards.filter((c) => c.isPopular).slice(0, 4).map((c) => (
              <Link key={c.id} href={`/products/${c.slug}`} className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.images[0]} alt="" className="size-full object-cover" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust tiles */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: FlaskConical, k: "formulated" },
          { icon: ShieldCheck, k: "tested" },
          { icon: Timer, k: "dispatch" },
          { icon: Truck, k: "delivery" },
        ].map(({ icon: Icon, k }) => (
          <div key={k} className="rounded-2xl border bg-card p-5">
            <Icon className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">{t(`home.trust.${k}`)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t(`home.trust.${k}Sub`)}</p>
          </div>
        ))}
      </section>

      {/* Collection */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">{t("home.collection")}</h2>
          <Link href="/shop" className="flex items-center gap-1 text-sm font-medium hover:underline">{t("home.viewAll")} <ArrowRight className="size-4" /></Link>
        </div>
        <ProductGrid products={cards} categories={cats} limit={8} />
      </section>

      {/* Why */}
      <section className="bg-secondary/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight">{t("home.whyTitle")}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {(["a", "b", "c"] as const).map((k) => (
              <div key={k} className="rounded-2xl bg-card p-6">
                <p className="font-semibold">{t(`home.why.${k}`)}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t(`home.why.${k}Sub`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <StatsStrip
          stats={[
            { value: 312, label: t("home.stats.batches") },
            { value: 16, display: "16:00", label: t("home.stats.cutoff") },
            { value: 2.8, decimals: 1, label: t("home.stats.delivery") },
            { value: 61, suffix: "%", label: t("home.stats.repeat") },
          ]}
        />
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <FaqAccordion title={t("home.faqTitle")} faqs={faqs} />
      </section>

    </>
  );
}


export async function generateMetadata() {
  const t = await getTranslations("brand");
  const locale = await getLocale();
  return { title: `${t("name")} — ${t("tagline")}`, alternates: { canonical: `/${locale}` } };
}

// Catalogue is read from DB; refresh at most every 5 minutes (admin saves also revalidate).
export const revalidate = 300;
