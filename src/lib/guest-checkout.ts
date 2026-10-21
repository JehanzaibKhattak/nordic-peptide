import { randomBytes } from "node:crypto";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { bankTransferConfig } from "./bank-transfer";
import { avionEnabled } from "./avion";

export function guestBankCheckoutEnabled() {
  return process.env.GUEST_BANK_TRANSFER_ENABLED === "true" && avionEnabled() && Boolean(bankTransferConfig());
}

export async function guestCheckoutId(create = false) {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("SESSION_SECRET is required");
  const session = await getIronSession<{ id?: string }>(await cookies(), {
    password, cookieName: "peptbay_guest_checkout",
    cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax", path: "/", maxAge: 7 * 86400 },
  });
  if (!session.id && create) { session.id = randomBytes(32).toString("base64url"); await session.save(); }
  return session.id;
}

export function guestOwnerMatches(payload: unknown, id: string | undefined) {
  return Boolean(id && payload && typeof payload === "object" && "id" in payload && payload.id === id);
}
