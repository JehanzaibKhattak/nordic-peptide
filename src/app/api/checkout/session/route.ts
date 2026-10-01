import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { expireOrder } from "@/lib/orders";
import { enabledAdapters } from "@/lib/payments/registry";
import { getSettings } from "@/lib/settings";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

// Loads a checkout session for the payment page. Lazily expires the order if
// the reservation timer has passed.
export async function GET(req: NextRequest) {
  if (BROWSE_ONLY) return NextResponse.json({ ok: false, error: "browse_only" }, { status: 503 });
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const session = await db.checkoutSession.findUnique({ where: { token }, include: { order: { include: { items: true } } } });
  if (!session) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const order = session.order;
  if (order.status === "RESERVED" && order.reservedUntil && order.reservedUntil < new Date()) {
    await expireOrder(order.id);
    return NextResponse.json({ ok: false, error: "expired" }, { status: 410 });
  }
  if (order.status === "EXPIRED" || order.status === "CANCELLED") return NextResponse.json({ ok: false, error: "expired" }, { status: 410 });

  const settings = await getSettings();
  return NextResponse.json(
    {
      ok: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        locale: order.locale,
        email: order.email,
        subtotalCents: order.subtotalCents,
        shippingCents: order.shippingCents,
        discountCents: order.discountCents,
        taxCents: order.taxCents,
        totalCents: order.totalCents,
        couponCode: order.couponCode,
        shippingMethod: order.shippingMethod,
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress,
        items: order.items.map((i) => ({ id: i.id, name: i.name, variantLabel: i.variantLabel, image: i.image, qty: i.qty, lineCents: i.lineCents })),
      },
      expiresAt: session.expiresAt.toISOString(),
      adapters: enabledAdapters().map((a) => ({ id: a.id, label: a.label })),
      legalEntity: settings.legalEntityName,
      brand: settings.brandName,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
