import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const identifier = z.string().min(1).max(128).regex(/^[A-Za-z0-9_.~-]+$/);
const query = z.object({
  cid: identifier.optional(),
  status: z.enum(["lead", "sale", "rejected", "rebill", "registration", "deposit", "trash"]).optional(),
  payout: z.string().regex(/^\d{1,8}(\.\d{1,4})?$/).optional(),
  tid: identifier.optional(),
  currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
}).strict();

// Diagnostic receiver only: never creates an order, confirms payment or records a conversion.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.POSTBACK_ECHO_ENABLED !== "true") return NextResponse.json({ error: "disabled" }, { status: 404 });
  if (!rateLimit(`postback-echo:${clientIp(req)}`, 60, 60_000).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  if (req.url.length > 2048) return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  if (Object.keys(parsed.data).length) console.info("[postback-echo] received", JSON.stringify(parsed.data));
  return NextResponse.json({ ok: true, received: parsed.data }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
