type PaymentMethod = "Visa" | "Mastercard" | "PayPal" | "Apple Pay" | "Klarna" | "iDEAL" | "Bancontact";

function PaymentLogo({ name }: { name: PaymentMethod }) {
  const widths: Record<PaymentMethod, string> = {
    Visa: "w-[5.25rem]", Mastercard: "w-12", PayPal: "w-12", "Apple Pay": "w-[4.25rem]", Klarna: "w-[3.5rem]", iDEAL: "w-12", Bancontact: "w-[3.75rem]",
  };
  return (
    <span role="img" aria-label={name} className={`flex h-8 shrink-0 items-center justify-center rounded-md bg-white px-1.5 shadow-sm ${widths[name]}`}>
      <svg aria-hidden="true" viewBox="0 0 84 34" className="h-6 w-full">
        {name === "Visa" && <text x="42" y="25" fill="#1434cb" fontFamily="Arial, sans-serif" fontSize="28" fontStyle="italic" fontWeight="900" textAnchor="middle">VISA</text>}
        {name === "Mastercard" && <><circle cx="36" cy="17" r="12" fill="#eb001b" /><circle cx="49" cy="17" r="12" fill="#f79e1b" /><path d="M42.5 7.1a12 12 0 0 1 0 19.8 12 12 0 0 1 0-19.8Z" fill="#ff5f00" /></>}
        {name === "PayPal" && <><path d="M31 7h13c7 0 10 4 9 10-1 7-6 10-13 10h-4l-1 5h-8l4-25Z" fill="#003087" /><path d="M38 11h12c6 0 9 3 8 9-1 6-5 9-12 9h-4l-1 4h-7l4-22Z" fill="#009cde" /></>}
        {name === "Apple Pay" && <><path d="M30 12c2-2 2-4 2-5-2 0-4 1-5 2-1 1-2 3-2 4 2 0 4 0 5-1Zm4 6c0-3 2-4 3-5-2-2-5-2-7-2-3 0-4 2-6 2-1 0-3-2-5-2-3 0-5 2-7 4-3 5 0 13 3 17 1 2 2 3 4 3 2 0 3-1 5-1s3 1 5 1c2 0 3-2 4-4 1-1 2-3 2-4-4-2-5-5-5-9Z" transform="translate(12 -2) scale(.7)" fill="#111" /><text x="57" y="22" fill="#111" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="600" textAnchor="middle">Pay</text></>}
        {name === "Klarna" && <><rect x="8" y="5" width="68" height="24" rx="12" fill="#ffb3c7" /><text x="42" y="22" fill="#111" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800" textAnchor="middle">Klarna.</text></>}
        {name === "iDEAL" && <><circle cx="27" cy="17" r="12" fill="#e6005c" /><circle cx="27" cy="17" r="6" fill="white" /><path d="M27 11a6 6 0 0 1 0 12" fill="#1684c7" /><text x="55" y="22" fill="#111" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="800" textAnchor="middle">iDEAL</text></>}
        {name === "Bancontact" && <><path d="M14 10 39 6l-6 9-25 4z" fill="#009fe3" /><path d="m8 19 25-4 7 7-25 5z" fill="#f5c400" /><text x="59" y="20" fill="#173b2e" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="700" textAnchor="middle">BANCONTACT</text></>}
      </svg>
    </span>
  );
}

export function PaymentLogos({ methods = ["Visa", "Mastercard", "PayPal", "Apple Pay", "Klarna"] }: { methods?: readonly PaymentMethod[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Payment methods">
      {methods.map((method) => <PaymentLogo key={method} name={method} />)}
    </div>
  );
}
