import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { logoutAction } from "../actions";

const NAV = [
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/postbacks", label: "Postbacks" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await requireAdmin())) redirect("/admin/login");
  return (
    <div>
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 text-sm">
          <span className="font-semibold">Admin</span>
          <nav className="flex flex-1 gap-4 overflow-x-auto">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap text-muted-foreground hover:text-foreground">{n.label}</Link>
            ))}
          </nav>
          <Link href="/en" className="text-muted-foreground hover:text-foreground">View store</Link>
          <form action={logoutAction}><button className="text-muted-foreground hover:text-foreground">Sign out</button></form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
