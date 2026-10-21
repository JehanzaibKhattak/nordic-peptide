import Link from "next/link";
import { db } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { resendPostbackAction } from "../../actions";
import { avionEnabled, getAvionPostbacks } from "@/lib/avion";

type Payload = { status?: string; url?: string; attempt?: number; httpStatus?: number; error?: string; reason?: string };

export default async function AdminPostbacks() {
  if (avionEnabled()) {
    let data;
    try { data = await getAvionPostbacks(); } catch {
      return <div><h1 className="text-xl font-semibold">Keitaro postbacks</h1><p role="alert" className="mt-6 rounded-xl border p-6">Postback status is temporarily unavailable. Refresh this page to try again. This does not stop the backend sender.</p></div>;
    }
    return (
      <div>
        <h1 className="text-xl font-semibold">Keitaro postbacks</h1>
        <p className="mt-2 text-sm">Backend sender: <strong>{!data.configured ? "Not configured" : data.enabled ? "Enabled" : "Disabled"}</strong></p>
        <p className="mt-2 text-sm text-muted-foreground">Latest 100 records for this storefront. Refresh to update. Sales appear after payment is confirmed in the back office and the order has a Keitaro click ID. Echo tests do not create conversions.</p>
        <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Event</TableHead><TableHead>Status</TableHead><TableHead>Attempts</TableHead><TableHead>Sent (UTC)</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.jobs.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No postbacks yet. No paid, attributed order has been queued.</TableCell></TableRow>}
              {data.jobs.map((job, i) => <TableRow key={`${job.order_ref}-${job.event}-${i}`}>
                <TableCell className="font-mono text-xs">{job.order_ref || "—"}</TableCell>
                <TableCell>{job.event}</TableCell>
                <TableCell><Badge variant={job.status === "sent" ? "outline" : "secondary"}>{job.status}</Badge></TableCell>
                <TableCell>{job.attempts}</TableCell>
                <TableCell>{job.sent_at || "—"}</TableCell>
                <TableCell>{job.last_error || "—"}</TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
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
