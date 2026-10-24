import { UK_ONLY_SHIPPING } from "@/config/shipping";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
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
  { title: "Founded on rigour", body: "Researchers deserve a supplier that treats peptides with rigour, transparency, and genuine care." },
  { title: "CoA is the price of entry", body: "Every peptide undergoes independent third-party analysis before it earns a place in our catalogue." },
  { title: "Stock what meets the standard", body: "We don't chase the broadest range. We stock what meets our standard, document it, and deliver it fast." },
];

const commitmentStats = [
  { value: "99%+", label: "Minimum purity across all peptides" },
  { value: "24 h", label: "Same-day shipping before 16:00" },
  { value: "2", label: UK_ONLY_SHIPPING ? "Working-day delivery aim in Great Britain" : "Day delivery anywhere in Europe" },
  { value: "100%", label: "Of products include a certificate of analysis" },
];

const trustPoints = [
  { title: "99%+ purity", detail: "Every batch, every time" },
  { title: "Third-party verified", detail: "COA included with every order" },
  { title: "Same-day dispatch", detail: "Order before 16:00" },
  { title: "1–2 day delivery", detail: UK_ONLY_SHIPPING ? "Great Britain via Royal Mail Tracked 24" : "Across Europe via PostNL & DHL" },
];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const cats = categories.map((c) => ({ slug: c.slug, name: c.name as Record<string, string> }));
  const cards = products.map(toCard);

  return (
    <div className="pb-v2">
      <section className="pb-hero">
        <div className="pb-hero-copy">
          <Image src="/v2/hex-light.svg" alt="" width={520} height={520} className="pb-hex" aria-hidden="true" />
          <h1>Research peptides in Europe</h1>
          <p className="mt-8 text-3xl font-medium leading-tight tracking-tight text-[#d5e0d8]">Verified, carefully curated.</p>
          <p className="mt-8 max-w-[520px] text-lg leading-relaxed text-[#b9c9be]">Peptbay supplies research-grade peptides with third-party testing, discreet packaging and batch documentation. Our initial launch delivers within Great Britain using Royal Mail Tracked 24.</p>
          <Link href="/shop" className="pb-pill mt-10 bg-[#f4f2ec] text-[#173b2e]">Browse the collection <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
        <div className="pb-hero-media">
          <Image src="/v2/hex-dark.svg" alt="" width={300} height={300} className="pb-hex" aria-hidden="true" />
          <Image src="/v2/avion-tirzep-pro-hero.png" alt="Avion Tirzep Pro prefilled pen kit" width={1600} height={1200} priority className="pb-hero-photo" />
        </div>
      </section>
      <section className="border-b border-[#173b2e24] bg-white"><div className="pb-wrap pb-trust">{trustPoints.map(({title,detail}) => <div key={title}><h2 className="text-[22px] font-semibold tracking-tight text-primary">{title}</h2><p className="mt-1.5 text-[15px] text-[#56645d]">{detail}</p></div>)}</div></section>
      <section className="pb-wrap pb-section"><ProductGrid products={cards} categories={cats} heading="The collection" shopLink /></section>
      <section id="commitment" className="pb-commitment pb-section">
        <div className="pb-wrap relative">
          <h2 className="pb-title max-w-[700px] !text-white">Why researchers choose Peptbay</h2>
          <div className="pb-stats">{commitmentStats.map(({value,label}) => <div key={value}><strong>{value}</strong><p>{label}</p></div>)}</div>
          <div className="pb-values">{commitments.map(({title,body}) => <article key={title}><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-[#b9c9be]">{body}</p></article>)}</div>
          <div className="pb-coa"><div><h3 className="max-w-[420px] text-4xl font-semibold leading-tight tracking-tight">COA included with every order</h3><Link href="/testing" className="mt-8 inline-flex rounded-full border border-white/30 px-5 py-3 text-sm">Batch documents →</Link></div>
            <div className="bg-white p-8 text-[#173b2e] md:p-12"><Image src="/v2/peptbay-logo.svg" alt="Peptbay" width={140} height={40} className="h-auto w-28" /><p className="mt-8 font-mono text-xs uppercase tracking-widest">Batch documentation</p><h4 className="mt-3 text-2xl font-semibold">Know your batch.</h4><p className="mt-4 text-sm leading-7 text-[#56645d]">Match your product and batch number to its laboratory report. Review the laboratory, test results and report date in the available documents.</p><Link href="/testing" className="mt-7 inline-flex text-sm font-semibold underline underline-offset-4">View available reports →</Link></div>
          </div>
        </div>
      </section>
      <FaqAccordion id="faq" title={locale === "es" ? "Preguntas habituales" : "Questions we hear most"} faqs={FAQs[locale] ?? FAQs.en} />
    </div>
  );
}

export async function generateMetadata() {
  const t = await getTranslations("brand");
  const locale = await getLocale();
  return { title: `${t("name")} — Peptide catalogue`, description: "Browse the Peptbay product catalogue.", alternates: { canonical: `/${locale}` } };
}

export const revalidate = 300;
