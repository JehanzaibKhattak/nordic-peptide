import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-session";
import { redirect } from "next/navigation";
import { SHIPPING_COUNTRIES } from "@/config/shipping";
import { DISPLAY_CURRENCIES } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reviewCommerce } from "./actions";

function Decision() {
  return <><label className="block">Reviewer name<Input name="reviewer" required minLength={3} maxLength={200} /></label><label className="block">Verification evidence and decision rationale<textarea name="evidence" required minLength={30} maxLength={4000} className="min-h-24 w-full rounded border p-2" /></label><div className="flex gap-3"><Button name="decision" value="APPROVED">Approve</Button><Button name="decision" value="REJECTED" variant="outline">Reject / revoke</Button></div></>;
}
export default async function ApprovalsPage() {
  if (!(await requireAdmin())) redirect("/admin/login");
  const [purchasers, products, destinations, currencies, audit] = await Promise.all([
    db.purchaser.findMany({ where: { status: { not: "UNSUBMITTED" } }, orderBy: { createdAt: "desc" } }),
    db.product.findMany({ orderBy: { sku: "asc" } }), db.shippingApproval.findMany(), db.checkoutCurrency.findMany(),
    db.commerceApproval.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return <div className="space-y-8"><h1 className="text-2xl font-semibold">Commerce approvals</h1><p>Independently verify institutional affiliation, registration, intended use, and destination restrictions. Record sources and dates. An attestation alone is insufficient. Approval here does not enable live payments. Expire or reconcile affected open Stripe sessions in Orders before changing approvals.</p>
    <h2 className="text-xl font-semibold">Purchaser review</h2>{purchasers.map(p => <details key={p.id} className="rounded-xl border p-4"><summary>{p.organization} · {p.email} · {p.status}</summary><dl className="my-4 space-y-2"><dt>Registration</dt><dd>{p.registrationId}</dd><dt>Website (verify independently)</dt><dd>{p.website}</dd><dt>Intended research</dt><dd className="whitespace-pre-wrap">{p.researchPurpose}</dd><dt>Previous decision</dt><dd>{p.reviewNotes}</dd></dl><form action={reviewCommerce} className="space-y-3"><input type="hidden" name="kind" value="purchaser" /><input type="hidden" name="id" value={p.id} /><label>Approval validity (days)<Input name="days" type="number" min={1} max={365} defaultValue={90} /></label><Decision /></form></details>)}
    <h2 className="text-xl font-semibold">Product eligibility</h2>{products.map(p => <details key={p.id} className="rounded-xl border p-4"><summary>{p.sku} · {p.researchApproved ? "Approved" : "Not approved"}</summary><form action={reviewCommerce} className="mt-4 space-y-3"><input type="hidden" name="kind" value="product" /><input type="hidden" name="id" value={p.id} /><label>Allowed ISO country codes (comma separated)<Input name="countries" defaultValue={Array.isArray(p.approvedCountries) ? p.approvedCountries.join(", ") : ""} /></label><Decision /></form></details>)}
    <h2 className="text-xl font-semibold">Destination eligibility</h2><p>{destinations.filter(d => d.approved).map(d => d.country).join(", ") || "No destinations approved"}</p><form action={reviewCommerce} className="space-y-3 rounded-xl border p-4"><input type="hidden" name="kind" value="destination" /><label>Destination<select name="id" className="block rounded border p-2">{SHIPPING_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label><Decision /></form>
    <h2 className="text-xl font-semibold">Checkout currencies</h2><p>EUR is the catalogue base currency. Optional checkout rates are fixed merchant prices, separate from approximate storefront display rates.</p><p>{currencies.map(c => `${c.code}: ${c.eurRate} (${c.enabled ? "enabled" : "disabled"})`).join(" · ")}</p><form action={reviewCommerce} className="space-y-3 rounded-xl border p-4"><input type="hidden" name="kind" value="currency" /><label>Currency<select name="id" className="block rounded border p-2">{DISPLAY_CURRENCIES.filter(c => c !== "EUR").map(c => <option key={c}>{c}</option>)}</select></label><label>Units per EUR<Input name="rate" type="number" step="any" min="0.000001" max="10000" required /></label><Decision /></form>
    <h2 className="text-xl font-semibold">Recent review audit</h2>{audit.map(a => <details key={a.id} className="border-b py-2"><summary>{a.createdAt.toISOString()} · {a.subject} · {a.decision} · {a.reviewer}</summary><p className="whitespace-pre-wrap">{a.evidence}</p></details>)}
  </div>;
}
