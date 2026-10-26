import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { argentBody, verifyArgentSignature, argentWebhookIntent } from "@/lib/payments/argent-api";
import { reconcileArgentPayment } from "@/lib/payments/argent";

export const maxDuration = 90;
export async function POST(req: Request) {
  let raw: string;
  try { raw = await argentBody(req); verifyArgentSignature(raw, req.headers.get("X-ArgentPlatforms-Signature")); }
  catch { return NextResponse.json({ error: "invalid_signature" }, { status: 400 }); }
  let intentId;
  try { intentId = argentWebhookIntent(raw); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const payment = intentId ? await db.argentPayment.findUnique({ where: { intentId } }) : null;
  if (!payment) return NextResponse.json({ received: true, ignored: true });
  try { await reconcileArgentPayment(payment.orderId); }
  catch { return NextResponse.json({ error: "reconciliation_pending" }, { status: 503 }); }
  return NextResponse.json({ received: true });
}
