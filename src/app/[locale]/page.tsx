import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, BadgeCheck, FileCheck, ShieldCheck, Star, Warehouse } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/product-grid";
import { StatsStrip } from "@/components/store/stats-strip";
import { FaqAccordion } from "@/components/store/faq-accordion";
import { JsonLd } from "@/components/store/json-ld";
import { getCategories, getProducts } from "@/lib/queries";
import { toCard } from "@/lib/card";

const HOME_FAQS = {
  en: [
    { q: "Which payment options can I use?", a: "The listed methods are iDEAL, Bancontact, PayPal, Klarna, SEPA instant transfer, and Visa or Mastercard. This Avion-PEPT preview is browse-only, so checkout is not currently enabled." },
    { q: "How quickly do orders arrive, and who delivers them?", a: "Weekday orders placed before 16:00 CET are described as same-day dispatch from the Netherlands. Tracked delivery within the EU typically takes 2–5 working days via DPD or PostNL." },
    { q: "Where do parcels ship from, and which countries are covered?", a: "Orders ship from the Netherlands to EU member states, the UK, Switzerland, and Norway. Confirm current destinations and shipping terms before ordering." },
    { q: "Can research peptides be purchased legally in the EU?", a: "Rules differ by country and product. These compounds are intended only for in-vitro research, not human or veterinary use. Check local requirements with a qualified legal source." },
    { q: "What testing supports the stated purity?", a: "The stated testing is independent HPLC analysis at 99% purity or higher, with identity checked by mass spectrometry. Review the relevant batch documentation for product-specific results." },
    { q: "What information does a Certificate of Analysis contain?", a: "A batch-specific CoA is a laboratory report that can record a compound’s identity, measured purity, and content. Batch reports are provided with product listings." },
    { q: "How should research compounds be stored?", a: "Follow the storage conditions on the product’s own documentation and your laboratory protocol. Sealed lyophilized material should be kept cold and protected from light." },
    { q: "Are parcels discreet, and can I track them?", a: "Parcels use plain outer packaging and tracked DPD or PostNL delivery. Tracking is sent after the carrier collects the parcel." },
    { q: "What if an order is damaged, missing, or incorrect?", a: "Opened or shipped vials are not returnable. Damaged, missing, or incorrect items may qualify for replacement or refund within 14 days; check the current returns policy for details." },
  ],
  es: [
    { q: "¿Qué formas de pago puedo utilizar?", a: "Los métodos indicados son iDEAL, Bancontact, PayPal, Klarna, transferencia SEPA instantánea y Visa o Mastercard. Esta vista previa de Avion-PEPT solo permite navegar; el pago no está habilitado." },
    { q: "¿Cuánto tarda el envío y qué transportistas se utilizan?", a: "Los pedidos laborables anteriores a las 16:00 CET se describen como enviados el mismo día desde los Países Bajos. El envío rastreado por la UE suele tardar entre 2 y 5 días laborables mediante DPD o PostNL." },
    { q: "¿Desde dónde se envía y a qué países?", a: "Los pedidos salen de los Países Bajos hacia los países de la UE, Reino Unido, Suiza y Noruega. Confirma los destinos y condiciones actuales antes de realizar un pedido." },
    { q: "¿Es legal comprar péptidos de investigación en la UE?", a: "Las normas varían según el país y el producto. Estos compuestos son solo para investigación in vitro, no para uso humano o veterinario. Consulta una fuente jurídica cualificada sobre la normativa local." },
    { q: "¿Qué pruebas respaldan la pureza indicada?", a: "Las pruebas descritas son análisis independiente de pureza por HPLC del 99 % o más y comprobación de identidad mediante espectrometría de masas. Consulta la documentación del lote para ver los resultados específicos." },
    { q: "¿Qué información contiene un Certificado de Análisis?", a: "Un CoA específico de lote es un informe de laboratorio que puede registrar la identidad, pureza medida y contenido del compuesto. Los informes de lote se facilitan junto a los productos." },
    { q: "¿Cómo deben almacenarse los compuestos de investigación?", a: "Sigue las condiciones de almacenamiento de la documentación del producto y el protocolo de tu laboratorio. El material liofilizado y sellado debe mantenerse frío y protegido de la luz." },
    { q: "¿Los paquetes son discretos y se pueden rastrear?", a: "Los paquetes utilizan embalaje exterior neutro y envío rastreado con DPD o PostNL. El seguimiento se envía después de que el transportista recoja el paquete." },
    { q: "¿Qué ocurre si un pedido llega dañado, incompleto o equivocado?", a: "Los viales abiertos o enviados no se pueden devolver. Los productos dañados, ausentes o incorrectos pueden optar a reemplazo o reembolso en 14 días; consulta la política de devoluciones vigente." },
  ],
};

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, categories, products] = await Promise.all([getTranslations(), getCategories(), getProducts()]);
  const faqs = HOME_FAQS[locale as "en" | "es"] ?? HOME_FAQS.en;
  const cats = categories.map((c) => ({ slug: c.slug, name: c.name as Record<string, string> }));
  const cards = products.map(toCard);

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />

      {/* Hero */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1344px] grid-cols-1 items-center gap-8 px-4 py-10 md:grid-cols-2 md:px-8 md:py-12 lg:min-h-[640px] lg:gap-12 lg:py-14">
          <div className="max-w-[600px]">
            <h1 className="font-serif text-[clamp(2.75rem,3.5vw,3.75rem)] font-semibold italic leading-[1.08] tracking-tight text-primary">
              <span className="block">{t("home.heroTitle")}</span>
              <span aria-hidden="true" className="my-5 block h-1 w-12 bg-primary" />
              <span className="block">{t("home.heroTitleSecond")}</span>
            </h1>
            <p className="mt-5 max-w-[35rem] font-serif text-lg leading-8 text-[#455e50] sm:text-xl">{t("home.heroSub")}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button size="lg" className="gap-3 rounded-lg bg-[#2d6048] px-7 text-white hover:bg-[#244e3a]" render={<Link href="/shop" />}>
                {t("home.ctaPrimary")} <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
              <Link href="/testing" className="text-sm font-medium text-[#ad8150] underline underline-offset-4 hover:text-[#855d35]">{t("home.ctaSecondary")}</Link>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm">
              <span className="font-semibold text-primary">4.4</span>
              <span className="flex gap-0.5" aria-label="4.4 out of 5 stars">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={`grid size-5 place-items-center ${i < 4 ? "bg-[#00b67a]" : "bg-[#d7ddd9]"}`}>
                    <Star aria-hidden="true" className="size-3.5 fill-white text-white" />
                  </span>
                ))}
              </span>
              <span className="font-medium text-[#00a970]">Trustpilot</span>
            </div>
          </div>
          <div className="relative h-[300px] overflow-hidden rounded-2xl bg-[#f7f4ed] sm:h-[380px] md:h-[420px] lg:h-[500px]">
            <Image src="/avion-tirzep-pro-hero.png" alt="Avion Tirzep Pro prefilled pen and accessories" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-[68%_50%]" />
          </div>
        </div>
      </section>

      {/* Trust tiles */}
      <section className="border-y border-[#e8e4dc] bg-white">
        <div className="mx-auto grid max-w-[1344px] grid-cols-2 divide-x divide-y divide-[#e8e4dc] md:grid-cols-4 md:divide-y-0">
          {[
            { icon: BadgeCheck, k: "purity" },
            { icon: FileCheck, k: "verified" },
            { icon: Warehouse, k: "dispatch" },
            { icon: ShieldCheck, k: "delivery" },
          ].map(({ icon: Icon, k }) => (
            <div key={k} className="flex min-h-44 flex-col items-center justify-center px-4 py-8 text-center md:min-h-[200px]">
              <Icon aria-hidden="true" className="size-8 text-primary" strokeWidth={1.6} />
              <p className="mt-3 text-base font-semibold text-primary md:text-lg">{t(`home.trust.${k}`)}</p>
              <p className="mt-1 text-sm text-muted-foreground md:text-base">{t(`home.trust.${k}Sub`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Collection */}
      <section className="bg-[#f6f2e9] py-20 md:py-24">
        <div className="mx-auto max-w-[1344px] px-4 md:px-8">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#83907c]">{t("home.collectionEyebrow")}</p>
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-primary md:text-4xl">{t("home.collection")}</h2>
            </div>
            <Link href="/shop" className="mb-1 flex items-center gap-1 text-sm font-medium text-primary hover:underline">{t("home.viewAll")} <ArrowRight className="size-4" /></Link>
          </div>
          <ProductGrid products={cards} categories={cats} limit={8} />
        </div>
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
      <FaqAccordion eyebrow={t("home.faqEyebrow")} title={t("home.faqTitle")} faqs={faqs} />

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
