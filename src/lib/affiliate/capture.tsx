"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Affiliate } from "../types";
import { ATTRIBUTION_WINDOW_MS, normalizeAttribution } from "./attribution";

export const ATTR_COOKIE = "kt_attr";
function save(attr: Affiliate) {
  const age = Math.max(0, Math.floor((Date.parse(attr.capturedAt) + ATTRIBUTION_WINDOW_MS - Date.now()) / 1000));
  try { document.cookie = `${ATTR_COOKIE}=${encodeURIComponent(JSON.stringify(attr))}; Max-Age=${age}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`; } catch { /* Cookies may be blocked. */ }
  try { localStorage.setItem(ATTR_COOKIE, JSON.stringify(attr)); } catch { /* Storage may be unavailable. */ }
}
export function readAttribution(): Affiliate | null {
  if (typeof document === "undefined") return null;
  let raw: string | undefined;
  try {
    raw = document.cookie.match(/(?:^|; )kt_attr=([^;]*)/)?.[1];
    const attr = raw ? normalizeAttribution(JSON.parse(decodeURIComponent(raw))) : null;
    if (attr) { save(attr); return attr; }
  } catch { /* Try the first-party backup. */ }
  try {
    raw = localStorage.getItem(ATTR_COOKIE) ?? undefined;
    const attr = raw ? normalizeAttribution(JSON.parse(raw)) : null;
    if (attr) { save(attr); return attr; }
    localStorage.removeItem(ATTR_COOKIE);
  } catch { /* Invalid or unavailable storage must not block checkout. */ }
  return null;
}
export function AffiliateCapture() {
  const search = useSearchParams();
  useEffect(() => {
    const p = new URLSearchParams(search.toString());
    const existing = readAttribution();
    if (existing && p.get("kt_override") !== "1") return;
    const attr = normalizeAttribution({ ...Object.fromEntries(p), ktSubid: p.get("kt") ?? p.get("subid") ?? p.get("sub_id"), capturedAt: new Date().toISOString() });
    if (attr) save(attr);
  }, [search]);
  return null;
}
