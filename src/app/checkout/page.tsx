import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAddresses } from "@/lib/data/addresses";
import { CheckoutClient } from "./checkout-client";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/checkout");
  }

  const addresses = await listAddresses(user.id);
  return <CheckoutClient initialAddresses={addresses} />;
}
