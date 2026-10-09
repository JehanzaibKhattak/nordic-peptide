import { CheckoutResult } from "@/components/checkout/checkout-result";
export const metadata = { robots: { index: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ session?: string }> }) {
  return <CheckoutResult locale={(await params).locale} token={(await searchParams).session} kind="failure" />;
}
