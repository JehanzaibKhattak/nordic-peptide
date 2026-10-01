import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteCouponAction, saveCouponAction } from "../../actions";

export default async function AdminCoupons() {
  const coupons = await db.coupon.findMany({ orderBy: { code: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Coupons</h1>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead><TableHead>Min. subtotal</TableHead><TableHead>Used</TableHead><TableHead>Active</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) => (
              <TableRow key={c.code}>
                <TableCell className="font-mono text-xs font-medium">{c.code}</TableCell>
                <TableCell>{c.type}</TableCell>
                <TableCell>{c.type === "PERCENT" ? `${c.value}%` : formatMoney(c.value)}</TableCell>
                <TableCell>{formatMoney(c.minCents)}</TableCell>
                <TableCell>{c.used}{c.usageLimit !== null ? ` / ${c.usageLimit}` : ""}</TableCell>
                <TableCell>{c.active ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">
                  <form action={deleteCouponAction}><input type="hidden" name="code" value={c.code} /><button className="text-xs text-destructive hover:underline">Delete</button></form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <form action={saveCouponAction} className="max-w-2xl space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Add or update a coupon</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="code">Code</Label><Input id="code" name="code" required placeholder="SUMMER10" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <select id="type" name="type" className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="PERCENT">Percent</option><option value="FIXED">Fixed (€)</option></select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="value">Value (% or €)</Label><Input id="value" name="value" type="number" step="0.01" min="0" required /></div>
          <div className="space-y-1.5"><Label htmlFor="min">Min. subtotal (€)</Label><Input id="min" name="min" type="number" step="0.01" min="0" defaultValue="0" /></div>
          <div className="space-y-1.5"><Label htmlFor="usageLimit">Usage limit (blank = none)</Label><Input id="usageLimit" name="usageLimit" type="number" min="1" /></div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="active" defaultChecked /> Active</label>
        </div>
        <Button type="submit">Save coupon</Button>
      </form>
    </div>
  );
}
