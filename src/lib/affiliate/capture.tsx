"use client";

import { useEffect } from "react";
import type { Affiliate } from "../types";

export const ATTR_COOKIE = "kt_attr";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function readAttribution(): Affiliate | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${ATTR_COOKIE}=([^;]*)`));
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1])) as Affiliate;
  } catch {
    return null;
  }
}

// First-touch wins unless ?kt_override=1. Runs on every page load so deep
// links into any lander capture attribution.
export function AffiliateCapture() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const kt = p.get("kt") ?? p.get("subid") ?? p.get("sub_id");
    const aff = p.get("aff");
    const subs = ["sub1", "sub2", "sub3", "sub4", "sub5"].filter((k) => p.get(k));
    if (!kt && !aff && subs.length === 0) return;

    const existing = readAttribution();
    if (existing && p.get("kt_override") !== "1") return;

    const attr: Affiliate = {
      ktSubid: kt ?? undefined,
      affId: aff ?? undefined,
      sub1: p.get("sub1") ?? undefined,
      sub2: p.get("sub2") ?? undefined,
      sub3: p.get("sub3") ?? undefined,
      sub4: p.get("sub4") ?? undefined,
      sub5: p.get("sub5") ?? undefined,
      source: p.get("utm_source") ?? p.get("source") ?? undefined,
      capturedAt: new Date().toISOString(),
    };
    document.cookie = `${ATTR_COOKIE}=${encodeURIComponent(JSON.stringify(attr))}; Max-Age=${THIRTY_DAYS}; Path=/; SameSite=Lax`;
  }, []);
  return null;
}
