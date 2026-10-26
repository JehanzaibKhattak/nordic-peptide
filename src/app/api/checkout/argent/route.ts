import { BROWSE_ONLY } from "@/lib/deployment-mode";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ownedArgentSession } from "@/lib/payments/argent-session";
import { startArgentPayment, reconcileArgentPayment } from "@/lib/payments/argent";
import { argentBody } from "@/lib/payments/argent-api";
import { isStoreOrigin } from "@/lib/store-origin";
import { commerceRateLimit } from "@/lib/commerce-rate-limit";
import { clientIp } from "@/lib/rate-limit";

export const maxDuration = 90;
export async function POST(req: Request) {
  const headers = { "cache-control": "no-store" };
  if (!isStoreOrigin(req)) return NextResponse.json({ error: "invalid_origin" }, { status: 403, headers });
  if (!await commerceRateLimit(`argent:${clientIp(req)}`, 30, 60000)) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers });
  const parsed = z.object({ session: z.string().min(10).max(200), action: z.enum(["start", "refresh"]) }).strict().safeParse(await argentBody(req).then(JSON.parse).catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers });
  if (parsed.data.action === "start" && BROWSE_ONLY) return NextResponse.json({ error: "checkout_paused" }, { status: 503, headers });
  const session = await ownedArgentSession(parsed.data.session);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404, headers });
  try {
    if (parsed.data.action === "refresh") return NextResponse.json(await reconcileArgentPayment(session.orderId), { headers });
    const base = new URL(process.env.STORE_BASE_URL ?? "");
    if (base.protocol !== "https:" && process.env.NODE_ENV === "production") throw new Error("store_url_not_configured");
    const returnUrl = new URL(`/${session.order.locale}/checkout/argent`, base);
    returnUrl.searchParams.set("session", session.token);
    return NextResponse.json({ url: await startArgentPayment(session.orderId, returnUrl.toString()) }, { headers });
  } catch { return NextResponse.json({ error: "Payment needs verification. Please check its status or contact support before trying again." }, { status: 409, headers }); }
}
