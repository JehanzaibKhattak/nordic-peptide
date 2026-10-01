import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/orders";
import { getAdapter } from "@/lib/payments/registry";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

const body = z.object({ token: z.string().min(10), adapterId: z.string() });

// Initiates payment with the chosen adapter. Session stays readable for page
// reloads; the order itself guards against double payment (markPaid is idempotent).
export async function POST(req: Request) {
  if (BROWSE_ONLY) return NextResponse.json({ error: "browse_only" }, { status: 503 });
  if (!rateLimit(`pay:${clientIp(req)}`, 20, 60_000).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const session = await db.checkoutSession.findUnique({ where: { token: parsed.data.token }, include: { order: { include: { items: true } } } });
  if (!session || session.expiresAt < new Date() || session.status !== "OPEN") return NextResponse.json({ error: "expired" }, { status: 410 });
  if (session.order.status !== "RESERVED" && session.order.status !== "PENDING") return NextResponse.json({ error: "not_payable" }, { status: 409 });

  const adapter = getAdapter(parsed.data.adapterId);
  if (!adapter) return NextResponse.json({ error: "adapter_disabled" }, { status: 400 });

  const base = process.env.STORE_BASE_URL ?? new URL(req.url).origin;
  let result;
  try {
    result = await adapter.createPayment(session.order, session, {
      returnUrl: `${base}/${session.order.locale}/checkout/complete?session=${session.token}`,
      webhookUrl: `${base}/api/checkout/webhook/${adapter.id}`,
    });
  } catch (e) {
    console.error(`[pay:${adapter.id}]`, e);
    await logEvent(session.order.id, "payment.init_failed", { adapter: adapter.id, error: String(e).slice(0, 300) });
    return NextResponse.json({ error: "provider_error" }, { status: 502 });
  }
  await logEvent(session.order.id, "payment.initiated", { adapter: adapter.id, kind: result.kind });
  return NextResponse.json(result);
}
