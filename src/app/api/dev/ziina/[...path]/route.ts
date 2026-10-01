import { NextResponse, type NextRequest } from "next/server";

// Dev-only fake of the Ziina Payment Intent API so the hosted-redirect flow
// can be exercised without a Ziina account. Point the adapter at it with
//   ZIINA_API_TOKEN=dev-fake  ZIINA_API_BASE=http://localhost:3000/api/dev/ziina
// The "hosted page" (/pay/<id>) completes the intent and returns to success_url;
// append ?fail=1 to simulate a failed payment.

type Intent = { id: string; amount: number; currency_code: string; status: string; message?: string; success_url?: string; cancel_url?: string; failure_url?: string; redirect_url: string };
const g = globalThis as unknown as { __fakeZiina?: Map<string, Intent> };
const store = (g.__fakeZiina ??= new Map());
const off = () => process.env.NODE_ENV === "production";

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (off()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const { path } = await params;
  if (path.join("/") !== "payment_intent") return NextResponse.json({ error: "not_found" }, { status: 404 });
  const b = await req.json();
  const id = `fake_${crypto.randomUUID()}`;
  const intent: Intent = { ...b, id, status: "requires_payment_instrument", redirect_url: `${req.nextUrl.origin}/api/dev/ziina/pay/${id}` };
  store.set(id, intent);
  return NextResponse.json(intent);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (off()) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const { path } = await params;
  const intent = store.get(path[1] ?? "");
  if (!intent) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (path[0] === "payment_intent") return NextResponse.json(intent);
  if (path[0] === "pay") {
    const fail = req.nextUrl.searchParams.get("fail") === "1";
    intent.status = fail ? "failed" : "completed";
    const to = (fail ? intent.failure_url : intent.success_url) ?? req.nextUrl.origin;
    return NextResponse.redirect(to.replace("{PAYMENT_INTENT_ID}", intent.id));
  }
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
