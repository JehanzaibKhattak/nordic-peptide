import Link from "next/link";
import { db } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { resendPostbackAction } from "../../actions";
import { avionEnabled } from "@/lib/avion";

type Payload = { status?: string; url?: string; attempt?: number; httpStatus?: number; error?: string; reason?: string };

export default async function AdminPostbacks() {
  if (avionEnabled()) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold">Keitaro postbacks</h1>
        <div className="mt-6 space-y-4 rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Managed by the Avion backend</h2>
          <p>Bank-transfer postbacks are sent by the back office. View their delivery status in the backend queue.</p>
          <div className="flex flex-wrap gap-4 text-sm underline underline-offset-4">
            <a href="https://admin.peptbay.com/tracking?status=sent">Sent postbacks</a>
            <a href="https://admin.peptbay.com/tracking?status=queued">Queued postbacks</a>
            <a href="https://admin.peptbay.com/tracking?status=failed">Failed postbacks</a>
          </div>
          <p className="text-sm text-muted-foreground">Sign in to the back office to view these records. A sale is queued only after payment is confirmed there and the order has a captured Keitaro click ID. Opening the echo test URL does not create a conversion.</p>
        </div>
      </div>
    );
  }

  const events = await db.orderEvent.findMany({
    where: { type: { startsWith: "postback." } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { order: { select: { id: true, orderNumber: true } } },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Keitaro postbacks</h1>
      <p className="mt-1 text-sm text-muted-foreground">Endpoint: <code>{process.env.KEITARO_POSTBACK_URL || "not configured"}</code></p>
      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Time (UTC)</TableHead><TableHead>Order</TableHead><TableHead>Result</TableHead><TableHead>Status</TableHead><TableHead>Detail</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No postbacks yet.</TableCell></TableRow>}
            {events.map((e) => {
              const p = e.payload as Payload;
              const kind = e.type.replace("postback.", "");
              return (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{e.createdAt.toISOString().slice(0, 19).replace("T", " ")}</TableCell>
                  <TableCell><Link href={`/admin/orders/${e.order.id}`} className="font-mono text-xs underline-offset-2 hover:underline">{e.order.orderNumber}</Link></TableCell>
                  <TableCell><Badge variant={kind === "sent" ? "outline" : "secondary"}>{kind}</Badge></TableCell>
                  <TableCell>{p.status ?? "—"}</TableCell>
                  <TableCell className="max-w-md truncate font-mono text-xs text-muted-foreground" title={p.url}>{p.httpStatus ? `HTTP ${p.httpStatus} · ` : ""}{p.error ?? p.reason ?? p.url ?? ""}</TableCell>
                  <TableCell className="text-right">
                    <form action={resendPostbackAction}><input type="hidden" name="id" value={e.order.id} /><button className="text-xs underline-offset-2 hover:underline">Resend</button></form>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
