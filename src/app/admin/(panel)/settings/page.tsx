import { getSettings } from "@/lib/settings";
import { enabledAdapters } from "@/lib/payments/registry";
import { SHIPPING_ZONES, CUTOFF_HOUR } from "@/config/shipping";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSettingsAction } from "../../actions";

export default async function AdminSettings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const s = await getSettings();
  const adapters = enabledAdapters();
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Settings</h1>
        {saved && <span className="rounded-full bg-accent px-2 py-0.5 text-xs">Saved</span>}
      </div>

      <form action={saveSettingsAction} className="space-y-3 rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="brandName">Brand name</Label><Input id="brandName" name="brandName" defaultValue={s.brandName} /></div>
          <div className="space-y-1.5"><Label htmlFor="legalEntityName">Legal entity (shown at checkout)</Label><Input id="legalEntityName" name="legalEntityName" defaultValue={s.legalEntityName} /></div>
          <div className="space-y-1.5"><Label htmlFor="reservationMinutes">Reservation window (minutes)</Label><Input id="reservationMinutes" name="reservationMinutes" type="number" min="1" defaultValue={s.reservationMinutes} /></div>
          <div className="space-y-1.5"><Label htmlFor="affiliatePayout">Affiliate payout per sale (€)</Label><Input id="affiliatePayout" name="affiliatePayout" type="number" step="0.01" min="0" defaultValue={(s.affiliatePayoutCents / 100).toFixed(2)} /></div>
          <div className="space-y-1.5"><Label htmlFor="reviewsRating">Reviews rating</Label><Input id="reviewsRating" name="reviewsRating" type="number" step="0.1" min="0" max="5" defaultValue={s.reviewsRating} /></div>
          <div className="space-y-1.5"><Label htmlFor="reviewsCount">Reviews count</Label><Input id="reviewsCount" name="reviewsCount" type="number" min="0" defaultValue={s.reviewsCount} /></div>
        </div>
        <Button type="submit">Save settings</Button>
      </form>

      <section className="rounded-xl border bg-card p-4 text-sm">
        <h2 className="font-semibold">Payment methods</h2>
        <p className="mt-1 text-muted-foreground">Enabled via environment variables.</p>
        <ul className="mt-2 list-disc pl-5">
          {adapters.length === 0 && <li className="text-destructive">None enabled</li>}
          {adapters.map((a) => <li key={a.id}>{a.label} <span className="font-mono text-xs text-muted-foreground">({a.id})</span></li>)}
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-4 text-sm">
        <h2 className="font-semibold">Shipping</h2>
        <p className="mt-1 text-muted-foreground">Dispatch cutoff {CUTOFF_HOUR}:00 CET. Zones are defined in <code>src/config/shipping.ts</code>.</p>
        <ul className="mt-2 space-y-1">
          {SHIPPING_ZONES.map((z) => (
            <li key={z.id}>{z.label}: {z.methods.map((m) => `${m.id} ${formatMoney(m.price)}`).join(" · ")} · free standard from {formatMoney(z.freeThresholdCents)}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
