import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { WelcomeOfferEmail } from "@/lib/email/templates";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { emailFingerprint, issueWelcomeOffer, WELCOME_DISCOUNT_PERCENT } from "@/lib/welcome-offer";

export const runtime = "nodejs";

const body = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`welcome:ip:${ip}`, 6, 60_000).ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });

  const email = parsed.data.email;
  if (!rateLimit(`welcome:email:${emailFingerprint(email)}`, 3, 60_000).ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const code = await issueWelcomeOffer(email);

  let emailed = true;
  try {
    await sendEmail({
      to: email,
      subject: `Your ${WELCOME_DISCOUNT_PERCENT}% welcome discount — ${code}`,
      react: WelcomeOfferEmail({ code }),
    });
  } catch {
    // The code is still valid and is shown in the dialog, so a mail outage must
    // not block the visitor from using it.
    emailed = false;
  }

  return NextResponse.json({ ok: true, code, discountPercent: WELCOME_DISCOUNT_PERCENT, emailed });
}
