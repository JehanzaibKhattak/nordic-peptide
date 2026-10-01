import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type AdminSession = { isAdmin?: boolean };

const options: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "dev-only-insecure-session-secret-change-me!!",
  cookieName: "nps_admin",
  cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax", httpOnly: true },
};

export async function getAdminSession() {
  return getIronSession<AdminSession>(await cookies(), options);
}

export async function requireAdmin() {
  const s = await getAdminSession();
  return Boolean(s.isAdmin);
}
