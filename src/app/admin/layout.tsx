import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import "../globals.css";
import { BROWSE_ONLY } from "@/lib/deployment-mode";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = { title: "Admin · Nordic Peptide Skin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  if (BROWSE_ONLY) notFound();
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
