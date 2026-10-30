"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useParams } from "next/navigation";

const productLabels: Record<string, string> = {
  retatrutide: "RETA PEN",
  tirzepatide: "TIRZEPATIDE PEN",
  "bpc-157-tb500-40mg": "BPC-157 + TB500",
  "ghk-cu-100mg": "GHK-Cu",
  "glow-70mg": "GLOW",
  "klow-80mg": "KLOW",
  "melanotan-ii-20mg": "MELANOTAN II",
  "mots-c-20mg": "MOTS-c",
  "bpc-157-10mg": "BPC-157",
};

export function WhatsAppButton({ phone }: { phone: string }) {
  // Route params match on server and client even when a campaign URL rewrites
  // to a product page; the browser pathname does not.
  const [showHelp, setShowHelp] = useState(true);
  const params = useParams<{ slug?: string }>();
  const digits = phone.replace(/\D/g, "");
  const productSlug = params?.slug;
  const productName = productSlug ? productLabels[productSlug] ?? productSlug.replaceAll("-", " ").toUpperCase() : undefined;
  const message = encodeURIComponent(productName
    ? `Hi Peptbay, I have a question about ${productName}.`
    : "Hi Peptbay, I have a question about your products.");
  const className = "grid size-12 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_4px_14px_rgba(0,0,0,0.2)] ring-4 ring-[#25d366]/10 transition hover:scale-105 hover:bg-[#1fbd5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173b2e] focus-visible:ring-offset-4 sm:size-16 sm:ring-8";
  const icon = (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="size-6 fill-current sm:size-8">
      <path d="M16.02 3.2A12.72 12.72 0 0 0 5.1 22.45L3.4 28.7l6.4-1.68a12.8 12.8 0 0 0 6.18 1.58h.01A12.72 12.72 0 0 0 16.02 3.2Zm-.03 23.25h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.8 1 1.02-3.7-.25-.4a10.57 10.57 0 1 1 8.83 4.81Zm5.8-7.92c-.32-.16-1.88-.93-2.17-1.04-.29-.1-.5-.15-.71.16-.21.32-.81 1.04-.99 1.25-.18.21-.36.24-.68.08-.32-.16-1.34-.49-2.55-1.56-.94-.83-1.57-1.86-1.76-2.18-.18-.31-.02-.49.14-.65.15-.15.32-.37.48-.55.16-.18.21-.31.32-.52.11-.21.05-.39-.03-.55-.08-.16-.71-1.72-.97-2.35-.25-.62-.51-.54-.71-.55h-.61c-.21 0-.55.08-.84.39-.29.32-1.1 1.08-1.1 2.63 0 1.56 1.13 3.06 1.29 3.27.16.21 2.22 3.39 5.38 4.75.75.33 1.34.52 1.8.66.76.24 1.45.2 2 .12.61-.09 1.88-.77 2.14-1.52.27-.75.27-1.39.19-1.52-.08-.14-.29-.22-.61-.38Z" />
    </svg>
  );

  return (
    <div className="pb-whatsapp fixed bottom-4 right-4 z-40 sm:bottom-7 sm:right-7">
      {showHelp && (
        <div className="absolute bottom-full right-0 mb-4 flex items-center gap-4 whitespace-nowrap rounded-2xl border border-[#d5cdbd] bg-white px-4 py-3 text-lg text-[#173b2e] shadow-sm">
          <span>Need help?</span>
          <button type="button" onClick={() => setShowHelp(false)} aria-label="Dismiss help message" className="rounded text-[#82917f] hover:text-[#173b2e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173b2e]">
            <X aria-hidden="true" className="size-6" />
          </button>
          <span aria-hidden="true" className="absolute -bottom-2 right-4 size-4 rotate-45 border-b border-r border-[#d5cdbd] bg-white sm:right-6" />
        </div>
      )}
      <a
        href={`https://wa.me/${digits}?text=${message}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={digits ? "Chat with Peptbay on WhatsApp" : "Open WhatsApp to message Peptbay"}
        title={digits ? "Chat with Peptbay" : "Open WhatsApp (business number not configured)"}
        className={className}
      >
        {icon}
      </a>
    </div>
  );
}
