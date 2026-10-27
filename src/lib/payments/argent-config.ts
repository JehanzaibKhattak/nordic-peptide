export type ArgentConfig = { publicKey: string; secretKey: string; signingSecret: string; companyId: string; live: boolean; hostedOrigins: string[]; hostedPaymentPageUrl?: string; checkoutCurrency: string };

export function argentConfig(): ArgentConfig | null {
  const { ARGENT_PUBLIC_KEY: publicKey, ARGENT_SECRET_KEY: secretKey, ARGENT_WEBHOOK_SECRET: signingSecret, ARGENT_COMPANY_ID: companyId, ARGENT_MODE: mode } = process.env;
  if (!publicKey || !secretKey || !signingSecret || !companyId || !["test", "live"].includes(mode ?? "")) return null;
  if (mode === "live" && process.env.ARGENT_ALLOW_LIVE !== "true") return null;
  const hostedOrigins = (process.env.ARGENT_HOSTED_ORIGINS ?? "").split(",").map(x => x.trim()).filter(Boolean);
  if (!hostedOrigins.length || hostedOrigins.some(origin => { try { const u = new URL(origin); return u.protocol !== "https:" || u.origin !== origin || Boolean(u.username || u.password); } catch { return true; } })) return null;
  const hostedPaymentPageUrl = process.env.ARGENT_HOSTED_PAYMENT_PAGE_URL;
  if (hostedPaymentPageUrl) { try { const url = new URL(hostedPaymentPageUrl); if (url.protocol !== "https:" || url.username || url.password || !hostedOrigins.includes(url.origin) || url.search || url.hash) return null; } catch { return null; } }
  const testCurrency = process.env.ARGENT_TEST_CURRENCY ?? "GBP";
  if (mode === "test" && !["GBP", "USD", "EUR"].includes(testCurrency)) return null;
  return { hostedPaymentPageUrl, checkoutCurrency: mode === "live" ? "GBP" : testCurrency, publicKey, secretKey, signingSecret, companyId, live: mode === "live", hostedOrigins };
}

export function argentEnabled() {
  const config = argentConfig();
  if (config?.live && (process.env.NEXT_PUBLIC_AVION_CHECKOUT !== "true" || !process.env.AVION_API_URL || !process.env.AVION_API_KEY)) return false;
  return process.env.ARGENT_CHECKOUT_ENABLED === "true" && process.env.ARGENT_CONTRACT_CONFIRMED === "true" && Boolean(config);
}
