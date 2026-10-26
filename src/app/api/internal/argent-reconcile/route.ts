import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { argentConfig } from "@/lib/payments/argent-config";
import { reconcileArgentPayment } from "@/lib/payments/argent";

export const maxDuration = 180;
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(req.headers.get("authorization") ?? ""), expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!argentConfig()) return NextResponse.json({ error: "argent_not_configured" }, { status: 503 });
  const attempts = await db.argentPayment.findMany({ where: { intentId: { not: null }, status: { not: "REFUNDED" } }, orderBy: { updatedAt: "asc" }, take: 2 });
  let reconciled = 0;
  for (const attempt of attempts) { try { await reconcileArgentPayment(attempt.orderId); reconciled++; } catch { await db.argentPayment.update({ where: { orderId: attempt.orderId }, data: { updatedAt: new Date() } }); } }
  return NextResponse.json({ attempted: attempts.length, reconciled }, { headers: { "cache-control": "no-store" } });
}
