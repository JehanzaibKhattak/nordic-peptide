import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { t as lt } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AdminProducts() {
  const products = await db.product.findMany({ include: { variants: { orderBy: { sortOrder: "asc" } }, category: true }, orderBy: { createdAt: "asc" } });
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">Products</h1><Link href="/admin/products/new" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Add product</Link></div>
      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Category</TableHead><TableHead>Variants</TableHead><TableHead>Stock</TableHead><TableHead>Status</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell><Link href={`/admin/products/${p.id}`} className="font-medium underline-offset-2 hover:underline">{lt(p.name, "en")}</Link></TableCell>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell>{lt(p.category.name, "en")}</TableCell>
                <TableCell className="text-muted-foreground">{p.variants.filter((v) => v.isActive).map((v) => `${v.label} ${formatMoney(v.priceCents)}`).join(" · ")}</TableCell>
                <TableCell>{p.variants.filter((v) => v.isActive).reduce((n, v) => n + v.stock, 0)}</TableCell>
                <TableCell>{p.isActive ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Hidden</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
