import { createClient } from "@/lib/supabase/server";
import { listAddresses } from "@/lib/data/addresses";
import { AddressList } from "@/components/account/address-list";

export default async function AddressesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const addresses = await listAddresses(user!.id);

  return <AddressList initialAddresses={addresses} />;
}
