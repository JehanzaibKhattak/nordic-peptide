import { Package, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export function CheckoutTrust() {
  const t = useTranslations("checkout");
  return (
    <div className="my-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[#708477]">
      <span className="inline-flex items-center gap-1.5"><ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />{t("secureCheckout")}</span>
      <span className="inline-flex items-center gap-1.5"><Package aria-hidden="true" className="size-4 shrink-0 text-primary" />{t("dispatchBefore")}</span>
    </div>
  );
}
