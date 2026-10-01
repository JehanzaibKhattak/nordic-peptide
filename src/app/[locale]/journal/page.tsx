import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listArticles } from "@/lib/articles";

export async function generateMetadata() {
  const t = await getTranslations("journal");
  return { title: t("title"), description: t("intro") };
}

export default async function JournalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("journal");
  const articles = listArticles(locale);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("intro")}</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {articles.map((a) => (
          <Link key={a.slug} href={`/journal/${a.slug}`} className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md">
            <p className="text-xs text-muted-foreground">{a.date}</p>
            <h2 className="mt-2 font-semibold leading-snug">{a.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{a.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
