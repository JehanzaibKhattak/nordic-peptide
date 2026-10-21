import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import ReactMarkdown from "react-markdown";
import policy from "@/content/privacy-policy.json";

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (page !== "privacy") notFound();
  return { title: "Privacy Policy", description: "Peptbay Privacy Policy" };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; page: string }> }) {
  const { locale, page } = await params;
  if (page !== "privacy") notFound();
  setRequestLocale(locale);
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <article lang="en" className="break-words text-base leading-7 text-foreground [&_h1]:mb-6 [&_h1]:font-serif [&_h1]:text-4xl [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mb-3 [&_h4]:mt-6 [&_h4]:font-semibold [&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-2 [&_a]:underline [&_a]:underline-offset-4">
        <ReactMarkdown>{policy.markdown}</ReactMarkdown>
      </article>
    </main>
  );
}
