/** The proxy's internal request URL can differ from the public storefront URL. */
export function isStoreOrigin(req: Request, env: Record<string, string | undefined> = process.env) {
  if (!env.STORE_BASE_URL && env.NODE_ENV === "production") return false;
  try {
    const expected = new URL(env.STORE_BASE_URL || req.url);
    if (!["https:", "http:"].includes(expected.protocol) || expected.username || expected.password) return false;
    return req.headers.get("origin") === expected.origin;
  } catch { return false; }
}
