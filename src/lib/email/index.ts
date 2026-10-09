import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

// Email adapter: Resend when RESEND_API_KEY is set, otherwise log to the
// console and write an .eml to ./tmp/mail for inspection.

export type SendEmailInput = { to: string; subject: string; react: ReactElement; idempotencyKey?: string };

export async function sendEmail({ to, subject, react, idempotencyKey }: SendEmailInput): Promise<{ id: string; mode: "resend" | "dev" }> {
  const html = await render(react);
  const from = process.env.EMAIL_FROM ?? "Avion-PEPT <orders@example.com>";

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({ from, to, subject, html }, { idempotencyKey });
    if (error) throw new Error(`Resend: ${error.message}`);
    return { id: data?.id ?? "", mode: "resend" };
  }

  if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is required for production email");

  const id = `dev-${Date.now()}`;
  const dir = join(process.cwd(), "tmp", "mail");
  mkdirSync(dir, { recursive: true });
  const eml = `From: ${from}\nTo: ${to}\nSubject: ${subject}\nContent-Type: text/html; charset=utf-8\n\n${html}`;
  writeFileSync(join(dir, `${id}.eml`), eml);
  console.log(`[email:dev] → ${to} · "${subject}" · tmp/mail/${id}.eml`);
  return { id, mode: "dev" };
}
