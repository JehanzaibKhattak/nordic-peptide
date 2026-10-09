import { NextResponse } from "next/server";

// Real orders can only be paid by a verified Stripe test webhook.
export async function POST() {
  return NextResponse.json({ error: "mock_checkout_disabled" }, { status: 403 });
}
