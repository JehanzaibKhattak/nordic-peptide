import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { logEvent, markPaid } from "@/lib/orders";
import { getAdapter } from "@/lib/payments/registry";

// Return handler for redirect-based providers (Stripe, Ziina). Webhooks are
// the primary signal; where the adapter supports it we also confirm the
// payment server-to-server here so the order page shows "paid" immediately
// and a missed webhook can't strand a paid order.
export async function GET(req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const token = req.nextUrl.searchParams.get("session") ?? "";
  const session = await db.checkoutSession.findUnique({ where: { token }, include: { order: true } });
  const base = process.env.STORE_BASE_URL ?? req.nextUrl.origin;
  if (!session) return NextResponse.redirect(`${base}/${locale}/shop`);

  const order = session.order;
  if ((order.status === "RESERVED" || order.status === "PENDING") && order.paymentProvider) {
    const adapter = getAdapter(order.paymentProvider);
    try {
      const result = await adapter?.verifyReturn?.(order);
      if (result?.status === "paid") await markPaid(order.id, adapter!.id, result.providerRef);
      else if (result) await logEvent(order.id, "payment.failed", { provider: adapter!.id, providerRef: result.providerRef, raw: JSON.parse(JSON.stringify(result.raw ?? null)) });
    } catch (e) {
      await logEvent(order.id, "payment.verify_failed", { provider: order.paymentProvider, error: String(e).slice(0, 300) });
    }
  }
  return NextResponse.redirect(`${base}/${locale}/order/${order.orderNumber}`);
}
