import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { avionEnabled, syncAvionOrder } from "@/lib/avion";

export const maxDuration = 45;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!avionEnabled()) return NextResponse.json({ error: "avion_disabled" }, { status: 503 });
  const orders = await db.order.findMany({ where: { events: { some: { type: "avion.pending" }, none: { type: { in: ["avion.synced", "avion.failed"] } } } }, orderBy: { createdAt: "asc" }, take: 5, select: { id: true } });
  const results = await Promise.all(orders.map(order => syncAvionOrder(order.id)));
  return NextResponse.json({ attempted: orders.length, synced: results.filter(Boolean).length });
}
