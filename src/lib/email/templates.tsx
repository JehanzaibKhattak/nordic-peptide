import { formatOrderMoney } from "../money";
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text, Hr } from "@react-email/components";
import type { Order, OrderItem } from "@prisma/client";

type OrderWithItems = Order & { items: OrderItem[] };

const styles = {
  body: { backgroundColor: "#f4f5f3", fontFamily: "Helvetica, Arial, sans-serif", color: "#1f2a26" },
  container: { backgroundColor: "#ffffff", margin: "24px auto", padding: "32px", maxWidth: "560px", borderRadius: "12px" },
  h1: { fontSize: "22px", margin: "0 0 12px" },
  p: { fontSize: "15px", lineHeight: "22px", margin: "0 0 12px" },
  muted: { fontSize: "13px", color: "#6b746f" },
  row: { fontSize: "14px", lineHeight: "20px", margin: "0" },
  button: {
    display: "inline-block",
    backgroundColor: "#1f2a26",
    color: "#ffffff",
    padding: "12px 20px",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "15px",
  },
};

const brand = () => process.env.BRAND_NAME ?? "Avion-PEPT";

function Items({ order }: { order: OrderWithItems }) {
  return (
    <Section>
      {order.items.map((i) => (
        <Text key={i.id} style={styles.row}>
          {i.qty} × {i.name} ({i.variantLabel}) — {formatOrderMoney(i.lineCents, order.currency)}
        </Text>
      ))}
      <Hr />
      <Text style={styles.row}>Subtotal: {formatOrderMoney(order.subtotalCents, order.currency)}</Text>
      <Text style={styles.row}>Shipping: {order.shippingCents === 0 ? "Free" : formatOrderMoney(order.shippingCents, order.currency)}</Text>
      {order.discountCents > 0 && <Text style={styles.row}>Discount: −{formatOrderMoney(order.discountCents, order.currency)}</Text>}
      <Text style={{ ...styles.row, fontWeight: 700 }}>Total: {formatOrderMoney(order.totalCents, order.currency)}</Text>
    </Section>
  );
}

function Shell({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{brand()}</Text>
          {children}
          <Hr />
          <Text style={styles.muted}>
            {brand()} · For authorized laboratory research only. Not for human or veterinary administration. This is an automated message; replies are not monitored.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function OrderReservedEmail({ order, payUrl }: { order: OrderWithItems; payUrl: string }) {
  return (
    <Shell preview={`Complete payment for order ${order.orderNumber}`}>
      <Heading style={styles.h1}>Your order is reserved</Heading>
      <Text style={styles.p}>
        Order <strong>{order.orderNumber}</strong> is on hold for you. Complete payment to confirm it.
      </Text>
      <Link href={payUrl} style={styles.button}>
        Complete payment
      </Link>
      <Hr />
      <Items order={order} />
    </Shell>
  );
}

export function PaymentReceivedEmail({ order, orderUrl }: { order: OrderWithItems; orderUrl: string }) {
  return (
    <Shell preview={`Order ${order.orderNumber} confirmed`}>
      <Heading style={styles.h1}>Thanks — your order is confirmed</Heading>
      <Text style={styles.p}>
        {order.paymentProvider === "stripe" ? "A Stripe test payment was recorded. No real funds were collected and no goods will be dispatched." : "Payment has been received."} Order <strong>{order.orderNumber}</strong>.
      </Text>
      <Link href={orderUrl} style={styles.button}>
        View order
      </Link>
      <Hr />
      <Items order={order} />
    </Shell>
  );
}

export function OrderShippedEmail({ order }: { order: OrderWithItems }) {
  return (
    <Shell preview={`Order ${order.orderNumber} has shipped`}>
      <Heading style={styles.h1}>Your order has shipped</Heading>
      <Text style={styles.p}>
        Order <strong>{order.orderNumber}</strong> is on its way.
        {order.trackingNo ? (
          <>
            {" "}
            Tracking number: <strong>{order.trackingNo}</strong>.
          </>
        ) : null}
      </Text>
      <Items order={order} />
    </Shell>
  );
}

export function ReservationExpiredEmail({ order, shopUrl }: { order: OrderWithItems; shopUrl: string }) {
  return (
    <Shell preview={`Order ${order.orderNumber} expired`}>
      <Heading style={styles.h1}>Your reservation expired</Heading>
      <Text style={styles.p}>
        Order <strong>{order.orderNumber}</strong> was released because payment wasn&apos;t completed in time. No charge was made.
      </Text>
      <Link href={shopUrl} style={styles.button}>
        Back to the shop
      </Link>
    </Shell>
  );
}

export function ContactEmail({ name, email, message }: { name: string; email: string; message: string }) {
  return (
    <Shell preview={`Contact form from ${name}`}>
      <Heading style={styles.h1}>New contact message</Heading>
      <Text style={styles.p}>
        <strong>{name}</strong> · {email}
      </Text>
      <Text style={{ ...styles.p, whiteSpace: "pre-wrap" }}>{message}</Text>
    </Shell>
  );
}
