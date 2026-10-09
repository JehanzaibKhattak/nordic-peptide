import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { db } from "./db";

export async function getPurchaserSession() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return getIronSession<{ purchaserId?: string }>(await cookies(), {
    password, cookieName: "avion_purchaser",
    cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 },
  });
}

export async function currentPurchaser() {
  const session = await getPurchaserSession();
  return session.purchaserId ? db.purchaser.findUnique({ where: { id: session.purchaserId } }) : null;
}
