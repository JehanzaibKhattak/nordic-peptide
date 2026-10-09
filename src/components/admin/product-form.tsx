"use client";

import Image from "next/image";
import { useState } from "react";

type Variant = { id?: string; sku: string; label: string; concentration?: string | null; sizeMl: number; priceCents: number; stock: number; isActive: boolean };
type Faq = { q: string; a: string };
type Category = { id: string; name: unknown };
type Props = {
  action: (data: FormData) => void | Promise<void>;
  categories: Category[];
  product?: {
    id: string; slug: string; sku: string; categoryId: string; form: string; name: unknown; shortDescription: unknown;
    description: unknown; images: unknown; faqs: unknown; isActive: boolean; isPopular: boolean;
    variants: Variant[]; batchTests?: { id: string; batchNo: string; labName: string; pdfPath: string | null }[];
  };
  error?: string;
};

const translated = (value: unknown) => value && typeof value === "object" ? value as Record<string, string> : {};
const imageList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const faqList = (value: unknown, locale: "en" | "es") => {
  if (!value || typeof value !== "object") return [] as Faq[];
  const root = value as Record<string, unknown>;
  const list = Array.isArray(root[locale]) ? root[locale] : [];
  return list.filter((row): row is Faq => !!row && typeof row === "object" && "q" in row && "a" in row).map((row) => ({ q: String(row.q), a: String(row.a) }));
};

const inputClass = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
const labelClass = "mb-1.5 block text-sm font-medium";

export function ProductForm({ action, categories, product, error }: Props) {
  const name = translated(product?.name);
  const short = translated(product?.shortDescription);
  const description = translated(product?.description);
  const [variants, setVariants] = useState<Variant[]>(product?.variants ?? [{ sku: "", label: "", concentration: "", sizeMl: 0, priceCents: 0, stock: 0, isActive: true }]);
  const [images, setImages] = useState<string[]>(imageList(product?.images));
  const [faqsEn, setFaqsEn] = useState<Faq[]>(faqList(product?.faqs, "en"));
  const [faqsEs, setFaqsEs] = useState<Faq[]>(faqList(product?.faqs, "es"));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function uploadImage(file?: File) {
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) {
      setUploadError("Choose an image under 4 MB.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/product-images", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") throw new Error(result.error || "Upload failed.");
      setImages((current) => [...current, result.url]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function updateVariant(index: number, changes: Partial<Variant>) {
    setVariants((current) => current.map((variant, i) => i === index ? { ...variant, ...changes } : variant));
  }

  function updateFaq(locale: "en" | "es", index: number, changes: Partial<Faq>) {
    const setter = locale === "en" ? setFaqsEn : setFaqsEs;
    setter((current) => current.map((faq, i) => i === index ? { ...faq, ...changes } : faq));
  }

  function faqEditor(locale: "en" | "es", rows: Faq[], setter: (rows: Faq[]) => void) {
    return <div className="space-y-3">
      {rows.map((faq, index) => <div key={`${locale}-${index}`} className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
        <label><span className={labelClass}>Question ({locale.toUpperCase()})</span><input className={inputClass} value={faq.q} onChange={(event) => updateFaq(locale, index, { q: event.target.value })} /></label>
        <label><span className={labelClass}>Answer ({locale.toUpperCase()})</span><textarea className={inputClass} rows={2} value={faq.a} onChange={(event) => updateFaq(locale, index, { a: event.target.value })} /></label>
        <button type="button" className="text-left text-sm text-red-700 md:col-span-2" onClick={() => setter(rows.filter((_, i) => i !== index))}>Remove question</button>
      </div>)}
      <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setter([...rows, { q: "", a: "" }])}>Add {locale.toUpperCase()} question</button>
    </div>;
  }

  return <form action={action} className="space-y-6">
    {product && <input type="hidden" name="id" value={product.id} />}
    <input type="hidden" name="variantsJson" value={JSON.stringify(variants)} />
    <input type="hidden" name="imagesJson" value={JSON.stringify(images)} />
    <input type="hidden" name="faqsJson" value={JSON.stringify({ en: faqsEn, es: faqsEs })} />
    {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error === "duplicate" ? "That URL slug or SKU is already in use." : "Check required product details, variant SKUs, and prices."}</div>}

    <section className="space-y-4 rounded-xl border bg-card p-4 md:p-5">
      <h2 className="font-semibold">Product details</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label><span className={labelClass}>Product name (English)</span><input className={inputClass} name="name_en" defaultValue={name.en ?? ""} required /></label>
        <label><span className={labelClass}>Product name (Spanish)</span><input className={inputClass} name="name_es" defaultValue={name.es ?? ""} /></label>
        <label><span className={labelClass}>URL slug</span><input className={inputClass} name="slug" defaultValue={product?.slug ?? ""} placeholder="bpc-157" required /></label>
        <label><span className={labelClass}>Product SKU</span><input className={inputClass} name="sku" defaultValue={product?.sku ?? ""} required /></label>
        <label><span className={labelClass}>Category</span><select className={inputClass} name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id} required>{categories.map((category) => <option key={category.id} value={category.id}>{translated(category.name).en ?? category.id}</option>)}</select></label>
        <label><span className={labelClass}>Product type / form</span><input className={inputClass} name="form" defaultValue={product?.form ?? "PEPTIDE"} /></label>
      </div>
      <label className="block"><span className={labelClass}>Short description (English)</span><textarea className={inputClass} name="short_en" rows={2} defaultValue={translated(product?.shortDescription).en ?? ""} /></label>
      <label className="block"><span className={labelClass}>Short description (Spanish)</span><textarea className={inputClass} name="short_es" rows={2} defaultValue={translated(product?.shortDescription).es ?? ""} /></label>
      <label className="block"><span className={labelClass}>Full description (English)</span><textarea className={inputClass} name="description_en" rows={5} defaultValue={translated(product?.description).en ?? ""} /></label>
      <label className="block"><span className={labelClass}>Full description (Spanish)</span><textarea className={inputClass} name="description_es" rows={5} defaultValue={translated(product?.description).es ?? ""} /></label>
      <div className="flex flex-wrap gap-6 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={product?.isActive ?? true} /> Visible in store</label><label className="flex items-center gap-2"><input type="checkbox" name="isPopular" defaultChecked={product?.isPopular ?? false} /> Show popular badge</label></div>
    </section>

    <section className="space-y-4 rounded-xl border bg-card p-4 md:p-5">
      <div><h2 className="font-semibold">Product images</h2><p className="mt-1 text-sm text-muted-foreground">The first image is the main product photo. Add up to 4 MB per image.</p></div>
      <label className="inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-sm">{uploading ? "Uploading…" : "Choose image"}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={uploading} onChange={(event) => { void uploadImage(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
      {uploadError && <p role="alert" className="text-sm text-red-700">{uploadError}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((src, index) => <div key={`${src}-${index}`} className="overflow-hidden rounded-lg border">
        <div className="relative aspect-square bg-white"><Image src={src} alt={`Product photo ${index + 1}`} fill unoptimized className="object-contain p-2" /></div>
        <div className="flex items-center justify-between border-t p-2 text-xs"><span>{index === 0 ? "Main image" : `Image ${index + 1}`}</span><div className="flex gap-2"><button type="button" aria-label="Move image left" disabled={index === 0} onClick={() => setImages((current) => current.map((image, i) => i === index ? current[index - 1] : i === index - 1 ? current[index] : image))}>←</button><button type="button" aria-label="Move image right" disabled={index === images.length - 1} onClick={() => setImages((current) => current.map((image, i) => i === index ? current[index + 1] : i === index + 1 ? current[index] : image))}>→</button><button type="button" className="text-red-700" onClick={() => setImages((current) => current.filter((_, i) => i !== index))}>Remove</button></div></div>
      </div>)}</div>
    </section>

    <section className="space-y-4 rounded-xl border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Strengths and variants</h2><p className="mt-1 text-sm text-muted-foreground">Each strength remains on this product page with its own SKU.</p></div><button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setVariants((current) => [...current, { sku: "", label: "", concentration: "", sizeMl: 0, priceCents: 0, stock: 0, isActive: true }])}>Add strength</button></div>
      {variants.map((variant, index) => <div key={variant.id ?? `new-${index}`} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-7">
        <label><span className={labelClass}>Strength label</span><input className={inputClass} value={variant.label} onChange={(event) => updateVariant(index, { label: event.target.value })} required /></label>
        <label><span className={labelClass}>Variant SKU</span><input className={inputClass} value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value })} required /></label>
        <label><span className={labelClass}>Concentration</span><input className={inputClass} value={variant.concentration ?? ""} onChange={(event) => updateVariant(index, { concentration: event.target.value })} placeholder="16.67 mg/ml" /></label>
        <label><span className={labelClass}>Volume (ml)</span><input className={inputClass} type="number" min="0" step="0.01" value={variant.sizeMl} onChange={(event) => updateVariant(index, { sizeMl: Number(event.target.value) })} required /></label>
        <label><span className={labelClass}>Price (€)</span><input className={inputClass} type="number" min="0" step="0.01" value={(variant.priceCents / 100).toFixed(2)} onChange={(event) => updateVariant(index, { priceCents: Math.round(Number(event.target.value) * 100) })} required /></label>
        <label><span className={labelClass}>Stock</span><input className={inputClass} type="number" min="0" step="1" value={variant.stock} onChange={(event) => updateVariant(index, { stock: Number(event.target.value) })} required /></label>
        <div className="flex items-end justify-between gap-3"><label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={variant.isActive} onChange={(event) => updateVariant(index, { isActive: event.target.checked })} /> Available</label><button type="button" className="pb-2 text-sm text-red-700" onClick={() => setVariants((current) => current.filter((_, i) => i !== index))} disabled={variants.length === 1}>Remove</button></div>
      </div>)}
    </section>

    <section className="space-y-4 rounded-xl border bg-card p-4 md:p-5"><div><h2 className="font-semibold">Product FAQs</h2><p className="mt-1 text-sm text-muted-foreground">Optional answers shown on this product page.</p></div>{faqEditor("en", faqsEn, setFaqsEn)}{faqEditor("es", faqsEs, setFaqsEs)}</section>

    {product?.batchTests && <section className="space-y-4 rounded-xl border bg-card p-4 md:p-5"><h2 className="font-semibold">Batch analysis reports</h2><ul className="text-sm text-muted-foreground">{product.batchTests.length === 0 && <li>No reports yet.</li>}{product.batchTests.map((batch) => <li key={batch.id}><span className="font-mono">{batch.batchNo}</span> · {batch.labName} · {batch.pdfPath ? <a href={batch.pdfPath} className="underline" target="_blank">PDF</a> : "no file"}</li>)}</ul><div className="grid gap-3 sm:grid-cols-3"><label><span className={labelClass}>Batch number</span><input className={inputClass} name="batchNo" placeholder="B2409099" /></label><label><span className={labelClass}>Laboratory</span><input className={inputClass} name="labName" placeholder="Laboratory name" /></label><label><span className={labelClass}>Report PDF</span><input className={inputClass} name="batchPdf" type="file" accept="application/pdf" /></label></div></section>}

    <button type="submit" disabled={uploading} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{product ? "Save product" : "Create product"}</button>
  </form>;
}
