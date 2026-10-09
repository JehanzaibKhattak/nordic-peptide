import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, BadgeCheck, ClipboardList, FileCheck, Microscope, PackageCheck, ShieldCheck, Warehouse } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/product-grid";
import { FaqAccordion } from "@/components/store/faq-accordion";
import type { Faq } from "@/lib/types";
import { getCategories, getProducts } from "@/lib/queries";
import { toCard } from "@/lib/card";

const FAQs: Record<string, Faq[]> = {
  en: [
    { q: "Which payment methods do you accept?", a: "Checkout is disabled in this catalogue preview, and accepted payment methods have not been confirmed." },
    { q: "How fast is delivery and which carriers do you use?", a: "Delivery times, dispatch schedules, and carriers have not been confirmed for Avion-PEPT." },
    { q: "Where do you ship from and do you deliver across the EU?", a: "Shipping origin and destination coverage are not yet listed. Contact Avion-PEPT for current information." },
    { q: "Are research peptides legal to buy in the Netherlands and EU?", a: "Rules vary by country and compound. This page is not legal advice; check applicable requirements with a qualified local authority." },
    { q: "How do you verify peptide purity?", a: "No batch test reports are currently listed in this preview. Request and review product- and batch-specific documentation before relying on a purity claim." },
    { q: "What is a Certificate of Analysis (CoA)?", a: "A CoA is a document reporting test results for a specific batch. Avion-PEPT has not published CoAs in this preview." },
    { q: "How should research peptides be stored?", a: "No product-specific storage directions are provided in this catalogue. Refer to the product documentation and an appropriate laboratory protocol." },
    { q: "Is shipping discreet and tracked?", a: "Packaging and tracking arrangements have not been confirmed for Avion-PEPT." },
    { q: "What is your returns policy on research peptides?", a: "Online ordering is not enabled, and a returns policy has not yet been published." },
  ],
  es: [
    { q: "¿Qué métodos de pago aceptan?", a: "El pago está deshabilitado en esta vista previa del catálogo y aún no se han confirmado los métodos aceptados." },
    { q: "¿Cuánto tarda el envío y qué transportistas utilizan?", a: "Avion-PEPT aún no ha confirmado los plazos de entrega, horarios de envío ni transportistas." },
    { q: "¿Desde dónde envían y realizan entregas en toda la UE?", a: "El origen de los envíos y los destinos disponibles aún no están publicados. Contacta con Avion-PEPT para obtener información actualizada." },
    { q: "¿Es legal comprar péptidos de investigación en los Países Bajos y la UE?", a: "La normativa varía según el país y el compuesto. Esta página no constituye asesoramiento legal; consulta con una autoridad local cualificada." },
    { q: "¿Cómo verifican la pureza de los péptidos?", a: "Esta vista previa no incluye informes de análisis por lote. Solicita y revisa documentación específica del producto y lote antes de confiar en una afirmación de pureza." },
    { q: "¿Qué es un Certificado de Análisis (CoA)?", a: "Un CoA es un documento que presenta los resultados de análisis de un lote específico. Avion-PEPT aún no ha publicado CoA en esta vista previa." },
    { q: "¿Cómo deben almacenarse los péptidos de investigación?", a: "Este catálogo no proporciona instrucciones de almacenamiento específicas por producto. Consulta la documentación del producto y un protocolo de laboratorio adecuado." },
    { q: "¿El envío es discreto y tiene seguimiento?", a: "Avion-PEPT aún no ha confirmado las condiciones de embalaje ni el seguimiento de envíos." },
    { q: "¿Cuál es la política de devoluciones de los péptidos de investigación?", a: "Los pedidos online están deshabilitados y todavía no se ha publicado una política de devoluciones." },
  ],
};

const commitments = [
  { icon: Microscope, title: "Founded on rigour", body: "Researchers deserve a supplier that treats peptides with rigour, transparency, and genuine care." },
  { icon: ClipboardList, title: "CoA is the price of entry", body: "Every peptide undergoes independent third-party analysis before it earns a place in our catalogue." },
  { icon: PackageCheck, title: "Stock what meets the standard", body: "We don't chase the broadest range. We stock what meets our standard, document it, and deliver it fast." },
];

const commitmentStats = [
  { value: "99%+", label: "Minimum purity across all peptides" },
  { value: "24 h", label: "Same-day shipping before 16:00" },
  { value: "2", label: "Day delivery anywhere in Europe" },
  { value: "100%", label: "Of products include a certificate of analysis" },
];

const trustPoints = [
  { icon: BadgeCheck, title: "99%+ purity", detail: "Every batch, every time" },
  { icon: FileCheck, title: "Third-party verified", detail: "COA included with every order" },
  { icon: Warehouse, title: "Same-day dispatch", detail: "Order before 16:00" },
  { icon: ShieldCheck, title: "1–2 day delivery", detail: "Across Europe via PostNL & DHL" },
];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const cats = categories.map((c) => ({ slug: c.slug, name: c.name as Record<string, string> }));
  const cards = products.map(toCard);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#f7f4ed]">
        <div className="absolute inset-x-0 bottom-0 top-[20%] overflow-hidden xl:hidden">
          <Image src="/avion-tirzep-pro-hero.png" alt="" fill priority sizes="100vw" className="object-cover object-[center_60%] mix-blend-multiply opacity-65" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#f7f4ed] via-[#f7f4ed]/65 to-[#f7f4ed]/15 xl:hidden" />
        <div className="absolute inset-y-0 left-[38%] right-0 hidden xl:block">
          <Image src="/avion-tirzep-pro-hero.png" alt="" fill priority sizes="62vw" className="object-cover object-[62%_center] mix-blend-multiply" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#f7f4ed] via-[#f7f4ed]/50 to-transparent" />
        </div>
        <div className="relative mx-auto flex max-w-[1264px] flex-col px-5 pt-8 md:px-8 md:pt-10 xl:min-h-[clamp(560px,calc(100svh-108px),760px)] xl:justify-center xl:py-12">
          <div className="relative z-10 max-w-[570px] py-2 xl:w-[48%] xl:py-0">
            <h1 className="font-serif text-[clamp(2rem,4.4vw,3.5rem)] font-semibold italic leading-[1.08] tracking-tight text-primary">
              <span className="block">Research peptides in Europe</span>
              <span aria-hidden="true" className="my-5 block h-1 w-12 bg-primary" />
              <span className="block">verified, carefully curated.</span>
            </h1>
            <p className="mt-4 max-w-[34rem] font-serif text-base leading-7 text-[#455e50] sm:mt-5 sm:text-lg sm:leading-8 xl:text-xl">Avion-PEPT is Europe&apos;s verified source for research-grade peptides. Every compound is third-party tested, ships the same day before 16:00, and arrives within 1–2 days. Discreet packaging and meticulous documentation.</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 sm:mt-7">
              <Button size="lg" className="gap-3 rounded-lg bg-[#2d6048] px-7 text-white hover:bg-[#244e3a]" render={<Link href="/shop" />}>
                Browse the collection <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e8e4dc] bg-white">
        <div className="mx-auto grid max-w-[1264px] grid-cols-2 divide-x divide-y divide-[#e8e4dc] md:grid-cols-4 md:divide-y-0">
          {trustPoints.map(({ icon: Icon, title, detail }) => (
            <div key={title} className="flex min-h-[132px] flex-col items-center justify-center px-3 py-6 text-center md:min-h-[136px] md:px-4">
              <Icon aria-hidden="true" className="size-7 text-primary md:size-8" strokeWidth={1.6} />
              <p className="mt-2 text-sm font-semibold text-primary md:text-base">{title}</p>
              <p className="mt-1 text-xs text-[#7c897c] md:text-sm">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f6f2e9] py-14 md:py-20">
        <div className="mx-auto max-w-[1264px] px-4 md:px-8">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#83907c]">From our catalogue</p>
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-primary md:text-4xl">The collection</h2>
            </div>
            <Link href="/shop" className="mb-1 flex items-center gap-1 text-sm font-medium text-primary hover:underline">All products <ArrowRight className="size-4" /></Link>
          </div>
          <ProductGrid products={cards} categories={cats} />
        </div>
      </section>

      <section id="commitment" className="bg-[#f5f1e8] px-4 py-8 md:px-8 md:py-10">
        <div className="mx-auto grid max-w-[1264px] gap-9 rounded-[18px] bg-[#1d4b37] px-6 py-8 text-white sm:px-8 md:px-12 md:py-12 lg:min-h-[476px] lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-[50px] lg:py-12">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#aabbaa]">Our commitment</p>
            <h2 className="font-serif text-3xl font-semibold italic tracking-tight text-white md:text-4xl">Why researchers choose Avion-PEPT</h2>
            <div className="mt-7">
              {commitments.map(({ icon: Icon, title, body }, index) => (
                <article key={title} className={`flex gap-4 py-4 ${index < commitments.length - 1 ? "border-b border-white/10" : ""}`}>
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 text-[#e5eadf]">
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold leading-5 text-white">{title}</h3>
                    <p className="mt-1 text-sm leading-5 text-[#c5d0c6]">{body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5 lg:gap-4">
            {commitmentStats.map(({ value, label }) => (
              <div key={value} className="flex min-h-[104px] flex-col items-center justify-center rounded-xl bg-white/10 px-3 py-4 text-center sm:min-h-[108px] sm:px-5">
                <p className="font-serif text-3xl font-semibold leading-none text-white">{value}</p>
                <p className="mt-2 max-w-[15rem] text-xs leading-4 text-[#c5d0c6] sm:text-sm sm:leading-5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FaqAccordion id="faq" eyebrow={locale === "es" ? "Preguntas frecuentes" : "Common questions"} title={locale === "es" ? "Preguntas habituales" : "Questions we hear most"} faqs={FAQs[locale] ?? FAQs.en} />
    </>
  );
}

export async function generateMetadata() {
  const t = await getTranslations("brand");
  const locale = await getLocale();
  return { title: `${t("name")} — Peptide catalogue`, description: "Browse the Avion-PEPT product catalogue.", alternates: { canonical: `/${locale}` } };
}

export const revalidate = 300;
