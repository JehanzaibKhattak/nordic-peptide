import { NextResponse, type NextRequest } from "next/server";

// Dev stand-in for the Keitaro postback endpoint. Logs and echoes the query.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "disabled" }, { status: 404 });
  const q = Object.fromEntries(req.nextUrl.searchParams.entries());
  console.log("[dev/echo] postback", q);
  return NextResponse.json({ ok: true, received: q });
}
