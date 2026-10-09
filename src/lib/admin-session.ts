import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type AdminSession = { isAdmin?: boolean };

export async function getAdminSession() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  const options: SessionOptions = {
    password,
    cookieName: "avion_admin",
    cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax", httpOnly: true, path: "/", maxAge: 60 * 60 * 8 },
  };
  return getIronSession<AdminSession>(await cookies(), options);
}

export async function requireAdmin() {
  const s = await getAdminSession();
  return Boolean(s.isAdmin);
}
