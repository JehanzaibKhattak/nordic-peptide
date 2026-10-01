import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Markdown } from "@/components/store/markdown";
import { JsonLd } from "@/components/store/json-ld";
import { getArticle, listArticles } from "@/lib/articles";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return listArticles("en").map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const a = getArticle(slug, locale);
  return a ? { title: a.title, description: a.excerpt } : {};
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const a = getArticle(slug, locale);
  if (!a) notFound();
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: a.title, datePublished: a.date, description: a.excerpt }} />
      <p className="text-xs text-muted-foreground">{a.date}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{a.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{a.excerpt}</p>
      <Markdown className="mt-8 text-base">{a.body}</Markdown>
    </article>
  );
}
