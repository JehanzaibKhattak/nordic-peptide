import { processStripeEvent, verifyStripeEvent } from "@/lib/payments/stripe-webhook";
import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/payments/registry";
import { expireOrder, logEvent, markPaid, markRefunded } from "@/lib/orders";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

// Provider webhooks. Signature verification lives in the adapter; state
// transitions are idempotent so provider retries are safe.
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  // Continue accepting signed test events even while checkout is paused.
  if (provider === "stripe") {
    let event;
    try { event = verifyStripeEvent(await req.text(), req.headers.get("stripe-signature")); }
    catch { return NextResponse.json({ error: "invalid_signature" }, { status: 400 }); }
    try { await processStripeEvent(event); }
    catch (error) { console.error("Stripe event processing failed", event.id, error); return NextResponse.json({ error: "processing_failed" }, { status: 500 }); }
    return NextResponse.json({ received: true });
  }
  if (BROWSE_ONLY) return NextResponse.json({ error: "browse_only" }, { status: 503 });
  const adapter = getAdapter(provider);
  if (!adapter) return NextResponse.json({ error: "unknown_provider" }, { status: 404 });

  let result;
  try {
    result = await adapter.handleWebhook(req);
  } catch (e) {
    console.error(`[webhook:${provider}]`, e);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  if (!result.orderId) return NextResponse.json({ received: true, ignored: true });

  await logEvent(result.orderId, "webhook.received", { provider, status: result.status, providerRef: result.providerRef });

  switch (result.status) {
    case "paid":
      await markPaid(result.orderId, provider, result.providerRef);
      break;
    case "expired":
      await expireOrder(result.orderId);
      break;
    case "refunded":
      await markRefunded(result.orderId, "webhook", result.providerRef).catch(() => undefined);
      break;
    case "failed":
      await logEvent(result.orderId, "payment.failed", { provider, providerRef: result.providerRef });
      break;
  }
  return NextResponse.json({ received: true });
}
