/** Only continue the server-created intent; never let the browser create/reprice one. */
export function argentEmbeddedSession(hostedUrl: string) {
  const url = new URL(hostedUrl);
  if (url.origin !== "https://pay.argentplatforms.com" || url.username || url.password) throw new Error("Invalid payment session");
  const id = url.searchParams.get("id"), token = url.searchParams.get("token"), publicKey = url.searchParams.get("public_key");
  if (!id || !/^[A-Za-z0-9_-]{1,80}$/.test(id) || !token || token.length > 2000 || !publicKey || !/^pk_(test|live)_[A-Za-z0-9_-]+$/.test(publicKey)) throw new Error("Invalid payment session");
  return { payment_intent_id: id, token, public_key: publicKey };
}
