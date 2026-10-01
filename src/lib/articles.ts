import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cache } from "react";

// Journal articles: markdown files in content/research/<slug>.<locale>.md with
// a tiny frontmatter block. Falls back to the English file for missing locales.

export type Article = {
  slug: string;
  locale: string;
  title: string;
  excerpt: string;
  date: string;
  body: string;
};

const DIR = join(process.cwd(), "content", "research");

function parse(file: string, slug: string, locale: string): Article {
  const raw = readFileSync(join(DIR, file), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta: Record<string, string> = {};
  if (m) for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
  return { slug, locale, title: meta.title ?? slug, excerpt: meta.excerpt ?? "", date: meta.date ?? "", body: m ? m[2] : raw };
}

export const listArticles = cache((locale: string): Article[] => {
  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const slugs = Array.from(new Set(files.map((f) => f.replace(/\.[a-z]{2}\.md$/, ""))));
  return slugs
    .map((slug) => {
      const file = files.find((f) => f === `${slug}.${locale}.md`) ?? files.find((f) => f === `${slug}.en.md`);
      return file ? parse(file, slug, locale) : null;
    })
    .filter((a): a is Article => a !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
});

export const getArticle = cache((slug: string, locale: string): Article | null => {
  return listArticles(locale).find((a) => a.slug === slug) ?? null;
});
