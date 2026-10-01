import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expireStaleOrders } from "@/lib/orders";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

// Public status poll for the order page. Returns only non-sensitive fields.
export async function GET(_: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  if (BROWSE_ONLY) return NextResponse.json({ error: "browse_only" }, { status: 503 });
  const { orderNumber } = await params;
  await expireStaleOrders();
  const o = await db.order.findUnique({
    where: { orderNumber },
    select: { orderNumber: true, status: true, trackingNo: true, sessions: { where: { status: "OPEN" }, select: { token: true }, take: 1 } },
  });
  if (!o) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ orderNumber: o.orderNumber, status: o.status, trackingNo: o.trackingNo, payToken: o.sessions[0]?.token ?? null }, { headers: { "cache-control": "no-store" } });
}
