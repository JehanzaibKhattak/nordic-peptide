import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/store/contact-form";

export async function generateMetadata() {
  const t = await getTranslations("contact");
  return { title: t("title") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("intro")}</p>
      <div className="mt-8"><ContactForm /></div>
    </div>
  );
}
