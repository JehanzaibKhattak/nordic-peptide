/** Server-only configuration; never invent bank details or silently convert transfers. */
export function bankTransferConfig(env: Record<string, string | undefined> = process.env) {
  const instructions = env.BANK_TRANSFER_INSTRUCTIONS?.trim();
  const currency = env.BANK_TRANSFER_CURRENCY?.trim().toUpperCase();
  const hours = Number(env.BANK_TRANSFER_DEADLINE_HOURS);
  if (env.BANK_TRANSFER_ENABLED !== "true" || !instructions || !currency || !/^[A-Z]{3}$/.test(currency) || !Number.isInteger(hours) || hours < 1 || hours > 168) return null;
  return { instructions, currency, hours };
}

export function bankTransferOverdue(deadline: string, now = Date.now()) {
  return Date.parse(deadline) <= now;
}

/** Format the saved instructions; older or custom formats retain their original text. */
export function bankInstructionDetails(instructions: string) {
  const fields = instructions.split(";").map(field => field.trim());
  const value = (label: string) => fields.find(field => field.toLowerCase().startsWith(`${label.toLowerCase()}:`))?.slice(label.length + 1).trim();
  const holder = value("Account holder");
  const bank = value("Bank");
  const account = value("UK account number");
  const sortCode = value("Sort code");
  if (!holder || !bank || !account || !sortCode) return null;
  const international = value("For international transfers");
  return { holder, bank, account, sortCode,
    iban: international?.match(/^IBAN\s+(.+)$/i)?.[1],
    bic: value("SWIFT/BIC"),
    address: value("Bank address")?.split(/\.\s*Use your order number/i)[0],
  };
}
