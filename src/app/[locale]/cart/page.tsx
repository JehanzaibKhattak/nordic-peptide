"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useCart } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

// The drawer is the primary cart UI; this page just opens it for deep links.
export default function CartPage() {
  const t = useTranslations("cart");
  const open = useCart((s) => s.open);
  useEffect(() => open(), [open]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={open}>{t("title")}</Button>
        <Button variant="outline" render={<Link href="/shop" />}>{t("continue")}</Button>
      </div>
    </div>
  );
}
