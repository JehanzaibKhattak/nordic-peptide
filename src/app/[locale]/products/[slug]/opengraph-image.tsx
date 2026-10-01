import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/lib/queries";
import { t as lt } from "@/lib/types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const p = await getProductBySlug(slug);
  const name = p ? lt(p.name, locale) : "Nordic Peptide Skin";
  const sub = p ? lt(p.shortDescription, locale) : "";
  const from = p ? Math.min(...p.variants.map((v) => v.priceCents)) : 0;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg,#dfe8e2,#f7f8f6)", padding: 72, fontFamily: "sans-serif", color: "#1f2a26" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", opacity: 0.7 }}>Nordic Peptide Skin</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
            <div style={{ fontSize: 28, opacity: 0.75, maxWidth: 820 }}>{sub}</div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 600 }}>{from ? `From €${(from / 100).toFixed(2)}` : ""}</div>
        </div>
      </div>
    ),
    size,
  );
}
