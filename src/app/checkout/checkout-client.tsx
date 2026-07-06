"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/store/cart-context";
import { useAuth } from "@/lib/store/auth-context";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AddressForm } from "@/components/account/address-form";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/lib/constants/brand";
import { formatMoney } from "@/lib/utils";
import { openRazorpayCheckout, type RazorpaySuccessResponse } from "@/lib/razorpay/checkout";
import type { Address } from "@/types/domain";
import type { AddressInput } from "@/lib/validators/account";
import { ShoppingBag } from "lucide-react";

export function CheckoutClient({ initialAddresses }: { initialAddresses: Address[] }) {
  const router = useRouter();
  const { cart, isLoading, refresh } = useCart();
  const { user } = useAuth();

  const [addresses, setAddresses] = React.useState(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = React.useState<string | null>(
    initialAddresses.find((a) => a.isDefault)?.id ?? initialAddresses[0]?.id ?? null,
  );
  const [showAddressForm, setShowAddressForm] = React.useState(initialAddresses.length === 0);
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function reloadAddresses(): Promise<Address[]> {
    const res = await fetch("/api/v1/addresses");
    const json = await res.json();
    if (json.success) {
      setAddresses(json.data);
      return json.data;
    }
    return [];
  }

  async function handleSaveAddress(input: AddressInput) {
    const res = await fetch("/api/v1/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (json.success) {
      const list = await reloadAddresses();
      setSelectedAddressId(json.data.id ?? list[0]?.id ?? null);
      setShowAddressForm(false);
    }
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) {
      setError("Please select or add a delivery address");
      return;
    }
    setError(null);
    setIsPlacingOrder(true);

    try {
      const initRes = await fetch("/api/v1/checkout/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId: selectedAddressId }),
      });
      const initJson = await initRes.json();

      if (!initJson.success) {
        setError(initJson.error?.message ?? "Couldn't start checkout");
        setIsPlacingOrder(false);
        return;
      }

      const { orderId, razorpayOrderId, amount, currency, keyId } = initJson.data;

      await openRazorpayCheckout({
        key: keyId,
        amount,
        currency,
        name: BRAND.name,
        description: `Order ${initJson.data.orderNumber}`,
        order_id: razorpayOrderId,
        prefill: { email: user?.email ?? undefined },
        theme: { color: "#a9824c" },
        handler: async (response: RazorpaySuccessResponse) => {
          const verifyRes = await fetch("/api/v1/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          const verifyJson = await verifyRes.json();
          if (verifyJson.success) {
            await refresh();
            router.push(`/checkout/success?order=${orderId}`);
          } else {
            setError("Payment could not be verified. If you were charged, contact support with your order number.");
            setIsPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: async () => {
            await fetch("/api/v1/checkout/fail", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId, reason: "cancelled_by_user" }),
            });
            await refresh();
            setIsPlacingOrder(false);
          },
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setIsPlacingOrder(false);
    }
  }

  if (isLoading) {
    return <div className="container-page py-16 text-center text-sm text-muted">Loading checkout…</div>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Add something you love before checking out."
          ctaLabel="Continue shopping"
          ctaHref="/"
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl text-ink">Checkout</h1>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_360px]">
        <div>
          <section>
            <h2 className="font-display text-xl text-ink">Delivery Address</h2>

            {addresses.length > 0 && !showAddressForm ? (
              <div className="mt-4 space-y-3">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${
                      selectedAddressId === address.id ? "border-gold-deep bg-gold-light/10" : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{address.fullName}</span>
                        {address.isDefault ? <Badge variant="gold">Default</Badge> : null}
                      </div>
                      <p className="text-sm text-muted">{address.phone}</p>
                      <p className="mt-1 text-sm text-ink/80">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} {address.postalCode}
                      </p>
                    </div>
                  </label>
                ))}
                <Button variant="outline" size="sm" onClick={() => setShowAddressForm(true)}>
                  Add a new address
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-line p-4">
                <AddressForm
                  onSubmit={handleSaveAddress}
                  onCancel={addresses.length > 0 ? () => setShowAddressForm(false) : undefined}
                  submitLabel="Use this address"
                />
              </div>
            )}
          </section>
        </div>

        <div className="h-fit rounded-lg border border-line p-6">
          <h2 className="font-display text-lg text-ink">Order Summary</h2>
          <ul className="mt-4 space-y-3">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-ink/80">
                  {item.productName} <span className="text-muted">× {item.quantity}</span>
                </span>
                <span className="text-ink">{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatMoney(cart.subtotal)}</span>
            </div>
            {cart.discount > 0 ? (
              <div className="flex justify-between text-accent">
                <span>Discount {cart.couponCode ? `(${cart.couponCode})` : ""}</span>
                <span>-{formatMoney(cart.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-muted">
              <span>Tax</span>
              <span>{formatMoney(cart.tax)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Shipping</span>
              <span>{cart.shipping === 0 ? "Free" : formatMoney(cart.shipping)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-medium text-ink">
              <span>Total</span>
              <span>{formatMoney(cart.total)}</span>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

          <Button
            variant="gold"
            size="lg"
            className="mt-5 w-full"
            onClick={handlePlaceOrder}
            isLoading={isPlacingOrder}
            disabled={!selectedAddressId}
          >
            Pay {formatMoney(cart.total)}
          </Button>
          <p className="mt-3 text-center text-xs text-muted">Secured by Razorpay</p>
        </div>
      </div>
    </div>
  );
}
