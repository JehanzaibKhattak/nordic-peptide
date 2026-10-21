import { Check, CheckCheck, Clock3, Landmark, Mail, Package, ChevronDown } from "lucide-react";
import { bankInstructionDetails } from "@/lib/bank-transfer";
import { formatOrderMoney } from "@/lib/money";
import { Link } from "@/i18n/routing";
import { CopyPaymentValue } from "./copy-payment-value";
import { AvionContinueShopping } from "./avion-continue-shopping";

type ReceiptOrder = {
  orderNumber: string; status: string; currency: string; totalCents: number; shippingCents: number; discountCents: number;
  items: { id: string; name: string; variantLabel: string; qty: number; lineCents: number }[];
};

export function BankTransferReceipt({ order, bank, overdue, backendNumber, syncPending, refreshUrl }: {
  order: ReceiptOrder; bank: { instructions: string; reference: string; deadline: string }; overdue: boolean;
  backendNumber?: string; syncPending: boolean; refreshUrl: string;
}) {
  const pending = ["PENDING", "RESERVED"].includes(order.status);
  const payable = pending && !overdue;
  const details = bankInstructionDetails(bank.instructions);
  const money = (cents: number) => formatOrderMoney(cents, order.currency);
  const deadline = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London", timeZoneName: "short" }).format(new Date(bank.deadline));
  const status = pending ? overdue ? "Payment window ended" : "Awaiting bank transfer" : ({ PAID: "Payment received", FULFILLED: "Dispatched", CANCELLED: "Order cancelled", EXPIRED: "Order expired", REFUNDED: "Order refunded" }[order.status] ?? "Order received");
  const row = (label: string, value: string) => <div className="grid gap-1 border-b border-[#e9e9df] py-4 last:border-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-5"><dt className="text-sm text-[#68796d]">{label}</dt><dd className="min-w-0 text-sm text-[#173b2e]"><CopyPaymentValue label={label} value={value} /></dd></div>;
  return <main className="mx-auto max-w-5xl px-4 py-10 text-[#173b2e] sm:px-6 sm:py-14">
    <header className="mb-8 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#e9efe7]"><Check aria-hidden="true" className="size-7" /></div>
      <h1 className="font-serif text-3xl sm:text-4xl">Order received</h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#68796d]">{payable ? "Thank you. Complete your bank transfer using the details below." : pending ? "Please contact our team before sending payment." : "Thank you. You can find your order details below."}</p>
      <span className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${pending ? "bg-[#f8edce] text-[#795b1d]" : "bg-[#e9efe7] text-[#2d5b40]"}`}><Clock3 aria-hidden="true" className="size-3.5" />{status}</span>
    </header>

    <section aria-label="Payment summary" className="mb-6 grid gap-6 rounded-2xl bg-[#173b2e] p-5 text-[#f7f5eb] sm:p-7 md:grid-cols-[0.8fr_1.3fr_1fr] md:items-center">
      <div><p className="mb-2 text-xs uppercase tracking-widest text-[#b8c8b8]">{payable ? "Amount to transfer" : "Order total"}</p><p className="font-serif text-4xl tabular-nums">{money(order.totalCents)}</p><p className="mt-1 text-xs text-[#b8c8b8]">{order.currency} · Bank transfer</p></div>
      <div className="min-w-0 border-y border-white/15 py-5 md:border-x md:border-y-0 md:px-6 md:py-0"><p className="mb-2 text-xs uppercase tracking-widest text-[#b8c8b8]">Payment reference</p>{payable ? <CopyPaymentValue label="Payment reference" value={bank.reference} /> : <p className="break-all font-semibold">{bank.reference}</p>}<p className="mt-2 text-xs leading-5 text-[#b8c8b8]">{payable ? "Use this reference with your transfer." : "Quote this reference when contacting us."}</p></div>
      <div><p className="mb-2 text-xs uppercase tracking-widest text-[#b8c8b8]">Payment deadline</p><time dateTime={bank.deadline} className="text-sm font-medium leading-6">{deadline}</time><p className="mt-1 text-xs text-[#b8c8b8]">London time</p></div>
    </section>

    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-2xl border border-[#e3e5da] bg-white p-5 sm:p-7">
        <h2 className="flex items-center gap-3 font-serif text-2xl"><Landmark aria-hidden="true" className="size-5" />{payable ? "Bank transfer details" : status}</h2>
        {payable ? <>
          <p className="mt-2 text-sm leading-6 text-[#68796d]">Transfer {money(order.totalCents)} from your banking app or online banking.</p>
          {details ? <>
            <dl className="mt-3">{row("Account holder", details.holder)}{row("Bank", details.bank)}{row("Account number", details.account)}{row("Sort code", details.sortCode)}</dl>
            {details.iban && details.bic && <details className="group mt-5 rounded-xl border border-[#e3e5da] bg-[#fafaf6] px-4">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">Transferring from outside the UK?<ChevronDown aria-hidden="true" className="size-4 shrink-0 transition group-open:rotate-180" /></summary>
              <dl>{row("IBAN", details.iban)}{row("SWIFT / BIC", details.bic)}</dl>
              {details.address && <p className="pb-4 text-xs leading-5 text-[#68796d]"><span className="font-medium">Bank address:</span> {details.address}</p>}
            </details>}
          </> : <p className="mt-5 whitespace-pre-line break-words text-sm leading-7">{bank.instructions}</p>}
          <p className="mt-5 rounded-xl bg-[#edf2e9] px-4 py-3 text-xs leading-6 text-[#38583f]">Your order remains unpaid until our team confirms receipt. Dispatch follows payment confirmation.</p>
        </> : <p className="mt-4 text-sm leading-7 text-[#68796d]">{pending ? "The payment window has ended. Our team will review your order. Please contact us before sending money." : order.status === "PAID" ? "Your payment has been confirmed. Our team will arrange dispatch." : order.status === "FULFILLED" ? "Your order has been dispatched." : "This order is no longer awaiting a bank transfer. Contact our team if you need help."}</p>}
      </section>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-[#e3e5da] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-serif text-2xl">Your order</h2><p className="text-xs text-[#68796d]">Order ID: {backendNumber ?? order.orderNumber}</p></div>
          <ul className="my-4 divide-y divide-[#e9e9df]">{order.items.map(item => <li key={item.id} className="flex justify-between gap-4 py-4 text-sm"><div className="min-w-0"><p className="font-medium">{item.name}</p><p className="mt-1 text-xs text-[#68796d]">{item.variantLabel} · Qty {item.qty}</p></div><span className="shrink-0 tabular-nums">{money(item.lineCents)}</span></li>)}</ul>
          <dl className="space-y-3 border-t border-[#e9e9df] pt-4 text-sm">{order.discountCents > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{money(order.discountCents)}</dd></div>}<div className="flex justify-between text-[#68796d]"><dt>Shipping</dt><dd>{order.shippingCents ? money(order.shippingCents) : "Free"}</dd></div><div className="flex justify-between font-semibold"><dt>Total</dt><dd>{money(order.totalCents)}</dd></div></dl>
        </section>
        {payable && <section className="rounded-2xl bg-[#f0f2e9] p-5 sm:p-6"><h2 className="mb-5 text-sm font-semibold">What happens next</h2><ol className="space-y-5">{[{ icon: Landmark, title: "Make your bank transfer", body: "Include the payment reference shown above." }, { icon: CheckCheck, title: "We confirm your payment", body: "Our team checks that the funds have arrived." }, { icon: Package, title: "We arrange dispatch", body: "Your order moves to fulfilment after confirmation." }].map(({ icon: Icon, title, body }, index) => <li key={title} className="flex gap-3"><span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${index === 0 && payable ? "bg-[#173b2e] text-white" : "bg-white text-[#68796d]"}`}><Icon aria-hidden="true" className="size-4" /></span><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-[#68796d]">{body}</p></div></li>)}</ol></section>}
      </aside>
    </div>
    <div className="mt-8 flex flex-col items-center justify-between gap-5 sm:flex-row"><Link href="/contact" className="inline-flex items-center gap-2 text-sm underline underline-offset-4"><Mail aria-hidden="true" className="size-4" />Need help with your transfer?</Link><AvionContinueShopping label="Continue shopping" secondary /></div>
    {syncPending && <p className="mt-5 text-center text-xs text-[#68796d]">Your order has been saved. <a href={refreshUrl} className="underline underline-offset-4">Refresh order status</a></p>}
  </main>;
}
