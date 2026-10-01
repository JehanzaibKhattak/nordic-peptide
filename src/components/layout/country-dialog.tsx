"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart-store";
import { SHIPPING_COUNTRIES, flagEmoji } from "@/config/shipping";

export function CountryDialog({ children }: { children: React.ReactElement }) {
  const t = useTranslations("nav");
  const country = useCart((s) => s.country);
  const setCountry = useCart((s) => s.setCountry);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("shipTo")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="country-select">{t("shipTo")}</Label>
          <select
            id="country-select"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setOpen(false);
            }}
          >
            {SHIPPING_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {flagEmoji(c.code)} {c.name}
              </option>
            ))}
          </select>
        </div>
      </DialogContent>
    </Dialog>
  );
}
