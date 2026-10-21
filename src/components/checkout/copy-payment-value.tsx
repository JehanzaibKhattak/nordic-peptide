"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyPaymentValue({ label, value, copyValue }: { label: string; value: string; copyValue?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return <div className="min-w-0">
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="min-w-0 select-all break-words font-semibold tabular-nums [overflow-wrap:anywhere]">{value}</span>
      <button type="button" aria-label={`Copy ${label.toLowerCase()}`} onClick={async () => {
        try { await navigator.clipboard.writeText(copyValue ?? value); setState("copied"); }
        catch { setState("failed"); }
      }} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-current/15 px-3 text-xs font-medium transition hover:bg-current/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
        {state === "copied" ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
        {state === "copied" ? "Copied" : "Copy"}
      </button>
    </div>
    <span role="status" className={state === "failed" ? "mt-1 block text-xs" : "sr-only"}>{state === "failed" ? "Could not copy automatically. Select the value above to copy it." : state === "copied" ? `${label} copied` : ""}</span>
  </div>;
}
