import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ChevronRight, FlaskConical } from "lucide-react";
import { Link } from "@/i18n/routing";
import { getProductBySlug, getProducts } from "@/lib/queries";
import { t as lt } from "@/lib/types";
import { ProductGallery } from "@/components/store/product-gallery";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return { title: `${lt(product.name, locale)} | Avion-PEPT`, description: lt(product.description, locale) || lt(product.shortDescription, locale) };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  const name = lt(product.name, locale);
  const images = product.images as string[];
  const details = product.variants[0]?.label ?? lt(product.shortDescription, locale);
  const description = lt(product.description, locale);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 md:px-8 md:py-12">
      <nav className="mb-7 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="size-3" />
        <Link href="/shop" className="hover:text-foreground">Products</Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{name}</span>
      </nav>

      <div className="grid items-start gap-8 md:grid-cols-2 md:gap-12">
        <ProductGallery key={slug} images={images} name={name} />
        <div className="py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#83907c]">{lt(product.category.name, locale)}</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-primary">{name}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{lt(product.shortDescription, locale)}</p>

          <section className="mt-7">
            <h2 className="font-serif text-2xl font-semibold text-primary">Product overview</h2>
            <p className="mt-3 text-[15px] leading-7 text-[#596b5e]">{description}</p>
          </section>

          <div className="mt-6 rounded-2xl border border-[#e8e4dc] bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Catalogue details</h2>
            <dl className="mt-4 divide-y text-sm">
              <div className="grid grid-cols-[110px_1fr] gap-3 py-3"><dt className="text-muted-foreground">SKU</dt><dd>{product.sku}</dd></div>
              <div className="grid grid-cols-[110px_1fr] gap-3 py-3"><dt className="text-muted-foreground">Amount / volume</dt><dd>{details}</dd></div>
            </dl>
          </div>
          <aside className="mt-5 flex gap-3 rounded-xl bg-[#f3f0e8] p-4 text-sm leading-6 text-[#596b5e]">
            <FlaskConical aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>For laboratory research use only. Not for human or veterinary use, clinical administration, or therapeutic use.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}

export const revalidate = 300;
