import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { LoginForm } from "@/components/admin/login-form";

export default async function AdminLoginPage() {
  if (await requireAdmin()) redirect("/admin");
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6">
        <h1 className="text-lg font-semibold">Admin sign in</h1>
        <LoginForm />
      </div>
    </div>
  );
}
