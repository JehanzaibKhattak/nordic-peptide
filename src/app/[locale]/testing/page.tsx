import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/routing";
import { getBatchTests } from "@/lib/queries";
import { t as lt } from "@/lib/types";

export async function generateMetadata() {
  const t = await getTranslations("testing");
  return { title: t("title"), description: t("intro") };
}

export default async function TestingPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);
  const [t, tests] = await Promise.all([getTranslations("testing"), getBatchTests(q?.trim() || undefined)]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{t("intro")}</p>

      <form className="mt-8 flex gap-2" action="">
        <Input name="q" defaultValue={q ?? ""} placeholder={t("search")} className="max-w-sm" />
        <Button type="submit" variant="outline">{t("search")}</Button>
      </form>

      <div className="mt-8 overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("batch")}</TableHead>
              <TableHead>{t("product")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("lab")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("issued")}</TableHead>
              <TableHead className="text-right">{t("report")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{t("noResults")}</TableCell></TableRow>
            )}
            {tests.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.batchNo}</TableCell>
                <TableCell><Link href={`/products/${b.product.slug}`} className="hover:underline">{lt(b.product.name, locale)}</Link></TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{b.labName}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(b.issuedAt)}</TableCell>
                <TableCell className="text-right">
                  {b.pdfPath && (
                    <a href={b.pdfPath} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-medium hover:underline"><FileText className="size-4" />{t("download")}</a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
