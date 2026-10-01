import { NextResponse } from "next/server";
import { z } from "zod";
import { applyCoupon } from "@/lib/coupons";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const body = z.object({ code: z.string().min(1).max(40), subtotalCents: z.number().int().min(0) });

export async function POST(req: Request) {
  if (!rateLimit(`coupon:${clientIp(req)}`, 30, 60_000).ok) return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  return NextResponse.json(await applyCoupon(parsed.data.code, parsed.data.subtotalCents));
}
