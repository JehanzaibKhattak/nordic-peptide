import { db } from "../db";
import { currentPurchaser } from "../purchaser-session";
import { guestCheckoutId, guestOwnerMatches } from "../guest-checkout";

export async function ownedArgentSession(token: string) {
  const session = await db.checkoutSession.findUnique({ where: { token }, include: { order: { include: { items: true } } } });
  if (!session || session.order.paymentProvider !== "argent") return null;
  if (session.order.purchaserId) {
    return (await currentPurchaser())?.id === session.order.purchaserId ? session : null;
  }
  const owner = await db.orderEvent.findFirst({ where: { orderId: session.orderId, type: "guest.owner" } });
  return guestOwnerMatches(owner?.payload, await guestCheckoutId()) ? session : null;
}
