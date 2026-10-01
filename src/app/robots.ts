import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.STORE_BASE_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/*/checkout", "/*/order/", "/*/cart"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
