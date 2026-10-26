import "dotenv/config";
import { db } from "../src/lib/db";
import { recoverArgentPayment, recoverArgentRefund } from "../src/lib/payments/argent";

const [kind, orderNumber, providerId] = process.argv.slice(2);
if (!["payment", "refund"].includes(kind) || !orderNumber || !/^[A-Za-z0-9_-]{1,80}$/.test(providerId ?? "")) throw new Error("Usage: tsx scripts/argent-recover.ts payment|refund ORDER_NUMBER PROVIDER_ID");
try {
  const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });
  const result = kind === "payment" ? await recoverArgentPayment(order.id, providerId) : await recoverArgentRefund(order.id, providerId);
  console.log({ orderNumber, status: result.status });
} finally { await db.$disconnect(); }
