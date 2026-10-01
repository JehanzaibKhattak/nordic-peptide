import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, OrderError } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { LOCALES } from "@/lib/types";

const address = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  postcode: z.string().min(1).max(20),
  country: z.string().length(2),
  phone: z.string().max(40).optional().nullable(),
});

const body = z.object({
  locale: z.enum(LOCALES).default("en"),
  email: z.string().email(),
  shippingAddress: address,
  billingAddress: address,
  shippingMethod: z.enum(["standard", "express"]),
  couponCode: z.string().max(40).optional().nullable(),
  affiliate: z.record(z.string(), z.string().optional()).optional().nullable(),
  items: z.array(z.object({ variantId: z.string(), qty: z.number().int().min(1).max(10) })).min(1).max(30),
});

export async function POST(req: Request) {
  const rl = rateLimit(`orders:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const d = parsed.data;
    const { order, token, payUrl } = await createOrder({
      ...d,
      shippingAddress: { ...d.shippingAddress, line2: d.shippingAddress.line2 ?? undefined, phone: d.shippingAddress.phone ?? undefined },
      billingAddress: { ...d.billingAddress, line2: d.billingAddress.line2 ?? undefined, phone: d.billingAddress.phone ?? undefined },
      affiliate: d.affiliate && Object.keys(d.affiliate).length ? { capturedAt: new Date().toISOString(), ...d.affiliate } : null,
    });
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber, token, payUrl });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ ok: false, error: e.code, meta: e.meta }, { status: 409 });
    console.error(e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
