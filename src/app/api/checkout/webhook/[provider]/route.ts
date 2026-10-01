import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/payments/registry";
import { expireOrder, logEvent, markPaid, markRefunded } from "@/lib/orders";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

// Provider webhooks. Signature verification lives in the adapter; state
// transitions are idempotent so provider retries are safe.
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  if (BROWSE_ONLY) return NextResponse.json({ error: "browse_only" }, { status: 503 });
  const { provider } = await params;
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
