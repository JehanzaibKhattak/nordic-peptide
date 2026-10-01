import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl font-semibold tracking-tight">404</p>
      <p className="mt-3 text-muted-foreground">This page doesn&apos;t exist.</p>
      <Button className="mt-6" render={<Link href="/" />}>Home</Button>
    </div>
  );
}
