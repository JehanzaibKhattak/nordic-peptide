import { UK_ONLY_SHIPPING } from "@/config/shipping";
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
    { q: "Which payment methods do you accept?", a: "We accept Visa and Mastercard credit and debit cards, PayPal, Apple Pay, Klarna, iDEAL and Bancontact. If you have a question about paying for your order or using a particular payment method, contact us through WhatsApp or our contact page." },
    { q: "How fast is delivery and which carriers do you use?", a: UK_ONLY_SHIPPING ? "For our initial launch, delivery is by Royal Mail Tracked 24 within Great Britain. Tracked 24 aims for delivery on the next working day after dispatch; this is not a guaranteed delivery date. Checkout shows the website delivery charge, including any free-standard-delivery offer." : "Orders placed before 16:00 CET/CEST are scheduled for dispatch the same business day; orders placed later, at weekends or on holidays are processed on the next business day. Standard EU delivery is estimated at 2–4 business days via DHL or PostNL, with express delivery estimated at 1–2 business days via DHL Express. Delivery estimates and shipping charges depend on your destination and selected service." },
    { q: "Where do you ship from and do you deliver across the EU?", a: UK_ONLY_SHIPPING ? "Our initial launch delivers within Great Britain only. Northern Ireland, the Channel Islands and international delivery are not yet available. Contact us for sender details or questions about delivery to your address." : "We offer delivery to all 27 EU member states, as well as the United Kingdom, Switzerland, Norway and selected destinations outside Europe. Select your country at checkout to see the available shipping services and costs. For details about the dispatch location or delivery to a country not listed, contact our team before placing your order." },
    { q: "Are research peptides legal to buy in the Netherlands and EU?", a: "Our products are supplied for scientific and laboratory research only and are not intended for human or veterinary use. Permitted purchase, possession and import requirements can differ by country and compound. A research-only label is not a guarantee that a product is lawful in every jurisdiction; check the requirements that apply to your institution and destination before ordering." },
    { q: "How do you verify peptide purity?", a: "Review the product and batch-specific laboratory documentation available on our Batch Documents page. Match the product name and batch number to the material you are evaluating, then check the reported purity, test method, laboratory and report date. Contact us if you need documentation for a particular batch or help locating its report." },
    { q: "What is a Certificate of Analysis (CoA)?", a: "A Certificate of Analysis reports the analytical results for a specific batch, such as identity, purity and other measurements included in the test. It applies to the batch identified in the document. You can review available batch reports on our Batch Documents page; a CoA does not establish suitability for human use or prove medical safety or effectiveness." },
    { q: "How should research peptides be stored?", a: "Follow the storage conditions in the documentation for your exact product and batch. Storage requirements depend on the compound, formulation and whether the material has been reconstituted. Keep materials labelled and sealed, follow your laboratory’s handling procedures, and contact us for the relevant storage documentation if it is not included with your product." },
    { q: "Is shipping discreet and tracked?", a: "Orders are sent in discreet outer packaging and use tracked delivery services. Keep your order number and tracking details so you can follow your parcel. If tracking is unavailable, stops updating or shows a delivery problem, contact us with your order number so our team can help." },
    { q: "What is your returns policy on research peptides?", a: "Contact us promptly if an order arrives damaged, incomplete or different from what you ordered. Include your order number, a description of the issue and clear photos of the parcel and affected items. Please contact us before sending anything back so we can provide the appropriate instructions and explain the return, replacement or refund options for your order. Research materials should not be returned without handling instructions from our team." },
  ],
  es: [
    { q: "¿Qué métodos de pago aceptan?", a: "Aceptamos tarjetas de crédito y débito Visa y Mastercard, PayPal, Apple Pay, Klarna, iDEAL y Bancontact. Si tienes alguna pregunta sobre el pago de tu pedido o un método concreto, contacta con nosotros por WhatsApp o mediante nuestra página de contacto." },
    { q: "¿Cuánto tarda el envío y qué transportistas utilizan?", a: UK_ONLY_SHIPPING ? "En el lanzamiento inicial enviamos dentro de Gran Bretaña con Royal Mail Tracked 24. El servicio tiene como objetivo entregar el siguiente día laborable tras la expedición, sin garantizar esa fecha. Los gastos de envío y cualquier oferta de envío estándar gratuito aparecen al finalizar la compra." : "Los pedidos realizados antes de las 16:00 CET/CEST están previstos para salir el mismo día laborable. Los pedidos posteriores, de fin de semana o festivos se procesan el siguiente día laborable. La entrega estándar en la UE se estima en 2–4 días laborables con DHL o PostNL, y la entrega exprés en 1–2 días laborables con DHL Express. Los plazos y costes dependen del destino y del servicio elegido." },
    { q: "¿Desde dónde envían y realizan entregas en toda la UE?", a: UK_ONLY_SHIPPING ? "En el lanzamiento inicial entregamos únicamente dentro de Gran Bretaña. Irlanda del Norte, las Islas del Canal y los destinos internacionales todavía no están disponibles. Contacta con nosotros para consultar los datos del remitente o tu dirección de entrega." : "Ofrecemos entrega en los 27 Estados miembros de la UE, además del Reino Unido, Suiza, Noruega y determinados destinos fuera de Europa. Selecciona tu país al finalizar la compra para consultar los servicios y costes disponibles. Para conocer el lugar de expedición o consultar un país que no figure en la lista, contacta con nuestro equipo antes de realizar el pedido." },
    { q: "¿Es legal comprar péptidos de investigación en los Países Bajos y la UE?", a: "Nuestros productos se suministran exclusivamente para investigación científica y de laboratorio, no para uso humano ni veterinario. Los requisitos de compra, posesión e importación pueden variar según el país y el compuesto. Una etiqueta de uso exclusivo para investigación no garantiza que un producto sea legal en todos los países. Comprueba los requisitos aplicables a tu institución y destino antes de realizar un pedido." },
    { q: "¿Cómo verifican la pureza de los péptidos?", a: "Consulta la documentación de laboratorio específica del producto y lote en nuestra página de documentos de lote. Comprueba que el nombre del producto y el número de lote coincidan con el material que estás evaluando y revisa la pureza indicada, el método de análisis, el laboratorio y la fecha del informe. Contacta con nosotros si necesitas documentación de un lote concreto o ayuda para localizarla." },
    { q: "¿Qué es un Certificado de Análisis (CoA)?", a: "Un Certificado de Análisis presenta los resultados analíticos de un lote concreto, como identidad, pureza y otras mediciones incluidas en el análisis. Solo se aplica al lote identificado en el documento. Puedes consultar los informes disponibles en nuestra página de documentos de lote. Un CoA no establece la idoneidad para uso humano ni demuestra seguridad o eficacia médica." },
    { q: "¿Cómo deben almacenarse los péptidos de investigación?", a: "Sigue las condiciones de almacenamiento de la documentación de tu producto y lote específicos. Los requisitos dependen del compuesto, la formulación y de si el material se ha reconstituido. Mantén los materiales etiquetados y cerrados, sigue los procedimientos de tu laboratorio y solicita la documentación de almacenamiento si no se incluye con el producto." },
    { q: "¿El envío es discreto y tiene seguimiento?", a: "Los pedidos se envían en embalaje exterior discreto y mediante servicios con seguimiento. Conserva tu número de pedido y los datos de seguimiento para consultar el estado del paquete. Si el seguimiento no está disponible, deja de actualizarse o indica un problema de entrega, contacta con nosotros con tu número de pedido." },
    { q: "¿Cuál es la política de devoluciones de los péptidos de investigación?", a: "Contacta con nosotros lo antes posible si tu pedido llega dañado, incompleto o contiene artículos incorrectos. Incluye el número de pedido, una descripción del problema y fotos claras del paquete y los artículos afectados. Contacta antes de devolver cualquier artículo para que podamos facilitar las instrucciones y explicar las opciones de devolución, sustitución o reembolso aplicables. No devuelvas materiales de investigación sin instrucciones de manipulación de nuestro equipo." },
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
  { value: "2", label: UK_ONLY_SHIPPING ? "Working-day delivery aim in Great Britain" : "Day delivery anywhere in Europe" },
  { value: "100%", label: "Of products include a certificate of analysis" },
];

const trustPoints = [
  { icon: BadgeCheck, title: "99%+ purity", detail: "Every batch, every time" },
  { icon: FileCheck, title: "Third-party verified", detail: "COA included with every order" },
  { icon: Warehouse, title: "Same-day dispatch", detail: "Order before 16:00" },
  { icon: ShieldCheck, title: "1–2 day delivery", detail: UK_ONLY_SHIPPING ? "Great Britain via Royal Mail Tracked 24" : "Across Europe via PostNL & DHL" },
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
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url(/brand/molecule-lattice-hero.svg)" }} />
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
            <p className="mt-4 max-w-[34rem] font-serif text-base leading-7 text-[#455e50] sm:mt-5 sm:text-lg sm:leading-8 xl:text-xl">{UK_ONLY_SHIPPING ? "Peptbay supplies research-grade peptides with third-party testing, discreet packaging and batch documentation. Our initial launch delivers within Great Britain using Royal Mail Tracked 24." : "Peptbay is Europe’s verified source for research-grade peptides. Every compound is third-party tested, ships the same day before 16:00, and arrives within 1–2 days. Discreet packaging and meticulous documentation."}</p>
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
            <h2 className="font-serif text-3xl font-semibold italic tracking-tight text-white md:text-4xl">Why researchers choose Peptbay</h2>
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
  return { title: `${t("name")} — Peptide catalogue`, description: "Browse the Peptbay product catalogue.", alternates: { canonical: `/${locale}` } };
}

export const revalidate = 300;
