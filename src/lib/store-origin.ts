/** The proxy's internal request URL can differ from the public storefront URL. */
export function isStoreOrigin(req: Request, env: Record<string, string | undefined> = process.env) {
  if (!env.STORE_BASE_URL && env.NODE_ENV === "production") return false;
  try {
    const configured = [env.STORE_BASE_URL || req.url, ...(env.STORE_ADDITIONAL_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean)];
    const allowed = configured.map(value => {
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid store origin");
      return url.origin;
    });
    return allowed.includes(req.headers.get("origin") ?? "");
  } catch { return false; }
}
