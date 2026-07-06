import type { OrderStatus, PaymentStatus } from "@/types/domain";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  returned: "Returned",
  refund_pending: "Refund pending",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  created: "Created",
  pending: "Pending",
  authorized: "Authorized",
  captured: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

export function orderStatusVariant(status: OrderStatus): "gold" | "accent" | "success" | "danger" | "neutral" {
  if (status === "delivered") return "success";
  if (status === "cancelled" || status === "returned") return "danger";
  if (status === "confirmed" || status === "processing" || status === "packed" || status === "shipped" || status === "out_for_delivery") return "accent";
  return "neutral";
}
