"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const t = useTranslations("contact");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("busy");
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: fd.get("name"), email: fd.get("email"), message: fd.get("message") }),
    });
    setState(r.ok ? "sent" : "error");
  };

  if (state === "sent") return <p className="rounded-xl bg-accent px-4 py-3 text-sm">{t("sent")}</p>;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="name">{t("name")}</Label><Input id="name" name="name" required /></div>
      <div className="space-y-1.5"><Label htmlFor="email">{t("email")}</Label><Input id="email" name="email" type="email" required /></div>
      <div className="space-y-1.5"><Label htmlFor="message">{t("message")}</Label><Textarea id="message" name="message" rows={6} required /></div>
      {state === "error" && <p className="text-sm text-destructive">Something went wrong. Please try again.</p>}
      <Button type="submit" disabled={state === "busy"}>{t("send")}</Button>
    </form>
  );
}
