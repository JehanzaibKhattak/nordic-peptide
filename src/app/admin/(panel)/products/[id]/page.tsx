import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveProductAction } from "../../../actions";

export default async function AdminProductEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const p = await db.product.findUnique({ where: { id }, include: { variants: { orderBy: { sortOrder: "asc" } }, batchTests: { orderBy: { issuedAt: "desc" } } } });
  if (!p) notFound();
  const name = p.name as Record<string, string>;
  const short = p.shortDescription as Record<string, string>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">← Products</Link>
        <h1 className="text-xl font-semibold">{name.en}</h1>
        {saved && <span className="rounded-full bg-accent px-2 py-0.5 text-xs">Saved</span>}
      </div>

      <form action={saveProductAction} className="space-y-6">
        <input type="hidden" name="id" value={p.id} />

        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="name_en">Name (EN)</Label><Input id="name_en" name="name_en" defaultValue={name.en} required /></div>
            <div className="space-y-1.5"><Label htmlFor="name_es">Name (ES)</Label><Input id="name_es" name="name_es" defaultValue={name.es ?? ""} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="short_en">Short description (EN)</Label><Textarea id="short_en" name="short_en" defaultValue={short.en} rows={2} /></div>
          <div className="space-y-1.5"><Label htmlFor="short_es">Short description (ES)</Label><Textarea id="short_es" name="short_es" defaultValue={short.es ?? ""} rows={2} /></div>
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={p.isActive} /> Active</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="isPopular" defaultChecked={p.isPopular} /> Popular badge</label>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Variants</h2>
          <div className="mt-3 space-y-2">
            {p.variants.map((v) => (
              <div key={v.id} className="grid grid-cols-[1fr_120px_100px] items-end gap-3">
                <div className="space-y-1"><Label htmlFor={`label_${v.id}`}>Label <span className="font-mono text-xs text-muted-foreground">{v.sku}</span></Label><Input id={`label_${v.id}`} name={`label_${v.id}`} defaultValue={v.label} /></div>
                <div className="space-y-1"><Label htmlFor={`price_${v.id}`}>Price (€)</Label><Input id={`price_${v.id}`} name={`price_${v.id}`} type="number" step="0.01" min="0" defaultValue={(v.priceCents / 100).toFixed(2)} /></div>
                <div className="space-y-1"><Label htmlFor={`stock_${v.id}`}>Stock</Label><Input id={`stock_${v.id}`} name={`stock_${v.id}`} type="number" min="0" defaultValue={v.stock} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Batch tests</h2>
          <ul className="text-sm text-muted-foreground">
            {p.batchTests.length === 0 && <li>None yet.</li>}
            {p.batchTests.map((b) => (
              <li key={b.id}><span className="font-mono">{b.batchNo}</span> · {b.labName} · {b.pdfPath ? <a href={b.pdfPath} className="underline" target="_blank">PDF</a> : "no file"}</li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="batchNo">Batch number</Label><Input id="batchNo" name="batchNo" placeholder="B2409099" /></div>
            <div className="space-y-1.5"><Label htmlFor="labName">Laboratory</Label><Input id="labName" name="labName" placeholder="Laboratory name" /></div>
            <div className="space-y-1.5"><Label htmlFor="batchPdf">Report (PDF)</Label><Input id="batchPdf" name="batchPdf" type="file" accept="application/pdf" /></div>
          </div>
        </section>

        <Button type="submit">Save product</Button>
      </form>
    </div>
  );
}
