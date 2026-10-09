import Link from "next/link";
import { db } from "@/lib/db";
import { expireStaleOrders } from "@/lib/orders";
import { formatOrderMoney } from "@/lib/money";
import { ORDER_STATUSES, isOrderStatus, type Affiliate } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  await expireStaleOrders();
  const where = status && isOrderStatus(status) ? { status } : {};
  const orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { items: true } });

  return (
    <div>
      <h1 className="text-xl font-semibold">Orders</h1>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin" className={`rounded-full border px-3 py-1 ${!status ? "bg-primary text-primary-foreground" : ""}`}>All</Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin?status=${s}`} className={`rounded-full border px-3 py-1 ${status === s ? "bg-primary text-primary-foreground" : ""}`}>{s}</Link>
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead><TableHead>Status</TableHead><TableHead>Email</TableHead><TableHead>Items</TableHead><TableHead>Country</TableHead><TableHead>Affiliate</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No orders.</TableCell></TableRow>}
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell><Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-medium underline-offset-2 hover:underline">{o.orderNumber}</Link></TableCell>
                <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{o.email}</TableCell>
                <TableCell>{o.items.reduce((n, i) => n + i.qty, 0)}</TableCell>
                <TableCell>{o.shippingCountry}</TableCell>
                <TableCell className="font-mono text-xs">{(o.affiliate as Affiliate | null)?.ktSubid ?? "—"}</TableCell>
                <TableCell className="text-right">{formatOrderMoney(o.totalCents, o.currency)}</TableCell>
                <TableCell className="text-muted-foreground">{o.createdAt.toISOString().slice(0, 16).replace("T", " ")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
