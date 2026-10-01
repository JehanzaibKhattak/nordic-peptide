import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { ContactEmail } from "@/lib/email/templates";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const body = z.object({ name: z.string().min(1).max(120), email: z.string().email(), message: z.string().min(1).max(5000) });

export async function POST(req: Request) {
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 60_000).ok) return NextResponse.json({ ok: false }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const to = process.env.CONTACT_INBOX ?? process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? "orders@example.com";
  await sendEmail({ to, subject: `Contact form: ${parsed.data.name}`, react: ContactEmail(parsed.data) });
  return NextResponse.json({ ok: true });
}
