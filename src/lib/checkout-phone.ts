/** Basic format check shared by checkout and its API; carrier reachability is provider-verified. */
export function validCheckoutPhone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40 || !/^[+\d\s().-]+$/.test(value.trim())) return false;
  const compact = value.trim().replace(/[\s().-]/g, "");
  return /^\+?\d{8,15}$/.test(compact) && !/^\+?0+$/.test(compact);
}
