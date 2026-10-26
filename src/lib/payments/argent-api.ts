import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { argentConfig } from "./argent-config";

const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
export const argentIntentSchema = z.object({
  id, status: z.enum(["draft", "in_progress", "pending", "requires_action", "completed", "failed"]),
  reference: z.string(), company: z.object({ id }), currency: z.object({ code: z.string() }),
  live: z.boolean(), amount: z.union([z.number(), z.string()]),
  payment: z.union([id, z.object({ id }), z.null()]).optional(),
  hosted_payment_page_url: z.string().nullable().optional(), token: z.string().optional(),
});
export type ArgentIntent = z.infer<typeof argentIntentSchema>;

export function argentCents(amount: string | number): number {
  const text = String(amount);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error("argent_invalid_amount");
  const [major, minor = ""] = text.split(".");
  const cents = Number(major) * 100 + Number(minor.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > 99_999_999) throw new Error("argent_invalid_amount");
  return cents;
}

/** POSTs are never automatically retried: the provider has not documented an idempotency contract. */
export async function argentRequest(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<unknown> {
  const config = argentConfig();
  if (!config) throw new Error("argent_not_configured");
  if (!/^\/(payment-intents|payments|refunds)(\/[A-Za-z0-9_-]{1,80})?$/.test(path)) throw new Error("argent_invalid_path");
  const response = await fetch(`https://api.argentplatforms.com${path}`, {
    method, headers: { authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("argent_provider_unavailable");
  return response.json();
}

export function assertArgentIntent(intent: ArgentIntent, order: { orderNumber: string; totalCents: number; currency: string }, live: boolean) {
  const config = argentConfig();
  if (!config || intent.company.id !== config.companyId || intent.live !== live || live !== config.live || intent.reference !== order.orderNumber || intent.currency.code !== order.currency || argentCents(intent.amount) !== order.totalCents) throw new Error("argent_payment_mismatch");
}

export function argentHostedUrl(intent: ArgentIntent) {
  const config = argentConfig();
  if (!config || !intent.hosted_payment_page_url || !intent.token || intent.status !== "draft") throw new Error("argent_hosted_contract_mismatch");
  const url = new URL(intent.hosted_payment_page_url);
  if (url.protocol !== "https:" || url.username || url.password || !config.hostedOrigins.includes(url.origin)) throw new Error("argent_hosted_origin_rejected");
  // Same continuation parameters used by the official PaymentJS hosted flow.
  url.searchParams.set("id", intent.id); url.searchParams.set("token", intent.token); url.searchParams.set("public_key", config.publicKey);
  return url.toString();
}

export function verifyArgentSignature(raw: string, signature: string | null) {
  const config = argentConfig();
  if (!config || !signature || !/^[a-fA-F0-9]{64}$/.test(signature)) throw new Error("invalid_signature");
  const expected = createHmac("sha256", config.signingSecret).update(raw, "utf8").digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) throw new Error("invalid_signature");
}

export async function argentBody(req: Request) {
  if (!req.body) throw new Error("invalid_body");
  const reader = req.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  for (;;) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > 65536) { await reader.cancel(); throw new Error("body_too_large"); } chunks.push(value); }
  return Buffer.concat(chunks).toString("utf8");
}

/** Notifications identify a saved intent only; all status/amount data is retrieved with the secret key. */
export function argentWebhookIntent(raw: string): string | null {
  const value = JSON.parse(raw);
  const data = value?.data ?? value;
  const candidate = data?.payment_intent_id ?? (typeof data?.payment_intent === "string" ? data.payment_intent : data?.payment_intent?.id) ?? (data?.object === "payment_intent" ? data?.id : null);
  return id.safeParse(candidate).success ? candidate : null;
}
