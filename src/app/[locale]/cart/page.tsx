"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useCart } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

export default function CartPage() {
  const t = useTranslations("cart");
  const open = useCart((s) => s.open);
  useEffect(() => {
    if (!BROWSE_ONLY) open();
  }, [open]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-3 text-muted-foreground">{BROWSE_ONLY ? t("browseOnly") : t("empty")}</p>
      <div className="mt-6 flex justify-center gap-3">
        {!BROWSE_ONLY && <Button onClick={open}>{t("title")}</Button>}
        <Button variant="outline" render={<Link href="/shop" />}>{t("continue")}</Button>
      </div>
    </div>
  );
}
