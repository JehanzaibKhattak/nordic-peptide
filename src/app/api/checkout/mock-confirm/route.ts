import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent, markPaid } from "@/lib/orders";
import { mockAdapter, mockOutcome } from "@/lib/payments/mock";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

const body = z.object({ token: z.string().min(10), cardNumber: z.string().min(12) });

// Mock card confirmation. Acts as both the "gateway" and its webhook.
export async function POST(req: Request) {
  if (BROWSE_ONLY) return NextResponse.json({ ok: false, error: "browse_only" }, { status: 503 });
  if (!mockAdapter.isEnabled()) return NextResponse.json({ ok: false, error: "adapter_disabled" }, { status: 400 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

  const session = await db.checkoutSession.findUnique({ where: { token: parsed.data.token }, include: { order: true } });
  if (!session || session.expiresAt < new Date() || session.status !== "OPEN") return NextResponse.json({ ok: false, error: "expired" }, { status: 410 });
  if (!["RESERVED", "PENDING"].includes(session.order.status)) return NextResponse.json({ ok: false, error: "not_payable" }, { status: 409 });

  const outcome = mockOutcome(parsed.data.cardNumber);
  await logEvent(session.orderId, "payment.attempt", { provider: "mock", outcome });

  if (outcome === "invalid") return NextResponse.json({ ok: false, error: "invalid_card" }, { status: 400 });
  if (outcome === "declined") return NextResponse.json({ ok: false, error: "declined" }, { status: 402 });
  if (outcome === "delayed") await new Promise((r) => setTimeout(r, 5000)); // simulated 3DS

  const order = await markPaid(session.orderId, "mock", `mock_${Date.now()}`);
  return NextResponse.json({ ok: true, orderNumber: order?.orderNumber });
}
