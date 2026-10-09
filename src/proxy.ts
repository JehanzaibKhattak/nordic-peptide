import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// Affiliate capture happens client-side (lib/affiliate/capture.ts) so that the
// cookie is first-party and works on statically cached pages. Here we only
// route locales; /admin and /api are untouched.
export default function proxy(req: NextRequest) {
  return intl(req);
}

export const config = {
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
