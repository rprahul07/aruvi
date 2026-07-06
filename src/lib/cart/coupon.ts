import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface CouponLineItem {
  productId: string;
  categoryId: string | null;
  collectionIds: string[];
  lineSubtotal: number;
}

export interface CouponEvaluation {
  valid: boolean;
  message?: string;
  couponId?: string;
  discountAmount: number;
  freeShipping: boolean;
}

/**
 * Full server-side validation — this is the ONLY place a coupon is
 * accepted or rejected. Requires an authenticated user: per-user usage
 * limits and first-order-only rules can't be enforced against an
 * anonymous guest, so applying a coupon requires being signed in.
 */
export async function evaluateCoupon(
  admin: SupabaseClient<Database>,
  code: string,
  userId: string | null,
  items: CouponLineItem[],
): Promise<CouponEvaluation> {
  const subtotal = items.reduce((sum, i) => sum + i.lineSubtotal, 0);

  const { data: coupon, error } = await admin
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  if (!coupon || !coupon.is_active) {
    return { valid: false, message: "Invalid coupon code", discountAmount: 0, freeShipping: false };
  }

  const now = new Date();
  if (new Date(coupon.starts_at) > now || (coupon.ends_at && new Date(coupon.ends_at) < now)) {
    return { valid: false, message: "This coupon has expired", discountAmount: 0, freeShipping: false };
  }

  if (!userId) {
    return { valid: false, message: "Sign in to apply a coupon code", discountAmount: 0, freeShipping: false };
  }

  if (coupon.customer_id && coupon.customer_id !== userId) {
    return { valid: false, message: "This coupon isn't valid for your account", discountAmount: 0, freeShipping: false };
  }

  if (subtotal < Number(coupon.min_order_amount)) {
    return {
      valid: false,
      message: `Add ₹${(Number(coupon.min_order_amount) - subtotal).toFixed(0)} more to use this coupon`,
      discountAmount: 0,
      freeShipping: false,
    };
  }

  if (coupon.is_first_order_only) {
    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("payment_status", "failed");
    if ((count ?? 0) > 0) {
      return { valid: false, message: "This coupon is for first orders only", discountAmount: 0, freeShipping: false };
    }
  }

  if (coupon.usage_limit_total != null) {
    const { count } = await admin
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id);
    if ((count ?? 0) >= coupon.usage_limit_total) {
      return { valid: false, message: "This coupon has reached its usage limit", discountAmount: 0, freeShipping: false };
    }
  }

  const { count: userUsageCount } = await admin
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", coupon.id)
    .eq("user_id", userId);
  if ((userUsageCount ?? 0) >= coupon.usage_limit_per_user) {
    return { valid: false, message: "You've already used this coupon", discountAmount: 0, freeShipping: false };
  }

  const { data: rules, error: rulesError } = await admin
    .from("coupon_rules")
    .select("scope_type, scope_id")
    .eq("coupon_id", coupon.id);
  if (rulesError) throw rulesError;

  let eligibleSubtotal = subtotal;
  if (rules && rules.length > 0) {
    eligibleSubtotal = items
      .filter((item) =>
        rules.some(
          (rule) =>
            (rule.scope_type === "product" && rule.scope_id === item.productId) ||
            (rule.scope_type === "category" && rule.scope_id === item.categoryId) ||
            (rule.scope_type === "collection" && item.collectionIds.includes(rule.scope_id)),
        ),
      )
      .reduce((sum, i) => sum + i.lineSubtotal, 0);

    if (eligibleSubtotal <= 0) {
      return {
        valid: false,
        message: "This coupon doesn't apply to the items in your cart",
        discountAmount: 0,
        freeShipping: false,
      };
    }
  }

  if (coupon.discount_type === "free_shipping") {
    return { valid: true, couponId: coupon.id, discountAmount: 0, freeShipping: true };
  }

  let discountAmount =
    coupon.discount_type === "percentage"
      ? eligibleSubtotal * (Number(coupon.discount_value) / 100)
      : Math.min(Number(coupon.discount_value), eligibleSubtotal);

  if (coupon.max_discount_amount != null) {
    discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount));
  }

  return {
    valid: true,
    couponId: coupon.id,
    discountAmount: Math.round(discountAmount * 100) / 100,
    freeShipping: false,
  };
}
