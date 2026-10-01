import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true, // seed placeholders are SVG; swap for webp product shots
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default withNextIntl(nextConfig);
