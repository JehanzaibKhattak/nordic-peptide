/** Server-only configuration; never invent bank details or silently convert transfers. */
export function bankTransferConfig(env: Record<string, string | undefined> = process.env) {
  const instructions = env.BANK_TRANSFER_INSTRUCTIONS?.trim();
  const currency = env.BANK_TRANSFER_CURRENCY?.trim().toUpperCase();
  const hours = Number(env.BANK_TRANSFER_DEADLINE_HOURS);
  if (env.BANK_TRANSFER_ENABLED !== "true" || !instructions || !currency || !/^[A-Z]{3}$/.test(currency) || !Number.isInteger(hours) || hours < 1 || hours > 168) return null;
  return { instructions, currency, hours };
}
