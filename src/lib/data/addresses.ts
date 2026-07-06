import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AddressInput } from "@/lib/validators/account";
import type { Address } from "@/types/domain";

function toAddress(row: {
  id: string;
  full_name: string;
  phone: string;
  alternate_phone: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  district: string | null;
  state: string;
  postal_code: string;
  country: string;
  address_type: string;
  is_default: boolean;
}): Address {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    alternatePhone: row.alternate_phone,
    line1: row.line1,
    line2: row.line2,
    landmark: row.landmark,
    city: row.city,
    district: row.district,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    addressType: row.address_type as Address["addressType"],
    isDefault: row.is_default,
  };
}

export async function listAddresses(userId: string): Promise<Address[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toAddress);
}

export async function createAddress(userId: string, input: AddressInput): Promise<Address> {
  const admin = createAdminClient();

  if (input.isDefault) {
    await admin.from("addresses").update({ is_default: false }).eq("user_id", userId);
  }

  const { data, error } = await admin
    .from("addresses")
    .insert({
      user_id: userId,
      full_name: input.fullName,
      phone: input.phone,
      alternate_phone: input.alternatePhone || null,
      line1: input.line1,
      line2: input.line2 || null,
      landmark: input.landmark || null,
      city: input.city,
      district: input.district || null,
      state: input.state,
      postal_code: input.postalCode,
      address_type: input.addressType,
      is_default: input.isDefault,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toAddress(data);
}

export async function updateAddress(userId: string, addressId: string, input: AddressInput): Promise<Address> {
  const admin = createAdminClient();

  if (input.isDefault) {
    await admin.from("addresses").update({ is_default: false }).eq("user_id", userId);
  }

  const { data, error } = await admin
    .from("addresses")
    .update({
      full_name: input.fullName,
      phone: input.phone,
      alternate_phone: input.alternatePhone || null,
      line1: input.line1,
      line2: input.line2 || null,
      landmark: input.landmark || null,
      city: input.city,
      district: input.district || null,
      state: input.state,
      postal_code: input.postalCode,
      address_type: input.addressType,
      is_default: input.isDefault,
    })
    .eq("id", addressId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return toAddress(data);
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("addresses").delete().eq("id", addressId).eq("user_id", userId);
  if (error) throw error;
}
