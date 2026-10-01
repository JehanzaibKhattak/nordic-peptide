import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// Affiliate capture happens client-side (lib/affiliate/capture.ts) so that the
// cookie is first-party and works on statically cached pages. Here we only
// route locales; /admin and /api are untouched.
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return NextResponse.next();
  return intl(req);
}

export const config = {
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
