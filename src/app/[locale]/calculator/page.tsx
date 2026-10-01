import { getTranslations, setRequestLocale } from "next-intl/server";
import { SequenceCalculator } from "@/components/calculator/sequence-calculator";

export async function generateMetadata() {
  const t = await getTranslations("calculator");
  return { title: t("title"), description: t("intro") };
}

export default async function CalculatorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("calculator");

  return (
    <section className="min-h-[70vh] bg-[#f6f2e9] px-4 py-14 md:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#82907f]">Avion-PEPT</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-primary md:text-5xl">{t("title")}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{t("intro")}</p>
        <div className="mt-9">
          <SequenceCalculator />
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-5 text-muted-foreground">{t("disclaimer")}</p>
      </div>
    </section>
  );
}
