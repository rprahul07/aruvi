import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderView, OrderStatus, PaymentStatus } from "@/types/domain";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
  order_items: {
    id: string;
    product_id: string | null;
    product_name: string;
    variant_label: string | null;
    sku: string;
    image_url: string | null;
    unit_price: number;
    quantity: number;
    line_total: number;
  }[];
  order_addresses: {
    address_type: string;
    full_name: string;
    phone: string;
    line1: string;
    line2: string | null;
    landmark: string | null;
    city: string;
    district: string | null;
    state: string;
    postal_code: string;
    country: string;
  }[];
}

function toOrderView(row: OrderRow): OrderView {
  const shipping = row.order_addresses.find((a) => a.address_type === "shipping") ?? row.order_addresses[0];

  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status as OrderStatus,
    paymentStatus: row.payment_status as PaymentStatus,
    subtotal: Number(row.subtotal_amount),
    discount: Number(row.discount_amount),
    tax: Number(row.tax_amount),
    shipping: Number(row.shipping_amount),
    total: Number(row.total_amount),
    currency: row.currency,
    items: row.order_items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      productName: i.product_name,
      variantLabel: i.variant_label,
      sku: i.sku,
      imageUrl: i.image_url,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
      lineTotal: Number(i.line_total),
    })),
    shippingAddress: {
      fullName: shipping?.full_name ?? "",
      phone: shipping?.phone ?? "",
      alternatePhone: null,
      line1: shipping?.line1 ?? "",
      line2: shipping?.line2 ?? null,
      landmark: shipping?.landmark ?? null,
      city: shipping?.city ?? "",
      district: shipping?.district ?? null,
      state: shipping?.state ?? "",
      postalCode: shipping?.postal_code ?? "",
      country: shipping?.country ?? "IN",
    },
    createdAt: row.created_at,
  };
}

const ORDER_SELECT = `
  id, order_number, status, payment_status, subtotal_amount, discount_amount,
  tax_amount, shipping_amount, total_amount, currency, created_at,
  order_items ( id, product_id, product_name, variant_label, sku, image_url, unit_price, quantity, line_total ),
  order_addresses ( address_type, full_name, phone, line1, line2, landmark, city, district, state, postal_code, country )
`;

export async function listUserOrders(userId: string): Promise<OrderView[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", userId)
    .neq("payment_status", "created")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as OrderRow[]).map(toOrderView);
}

export async function getUserOrder(userId: string, orderId: string): Promise<OrderView | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toOrderView(data as unknown as OrderRow);
}
