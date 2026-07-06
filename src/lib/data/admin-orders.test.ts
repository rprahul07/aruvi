import { describe, it, expect } from "vitest";
import { isValidTransition, nextStatuses } from "./admin-orders";

describe("order status transitions", () => {
  it("allows confirmed → processing", () => {
    expect(isValidTransition("confirmed", "processing")).toBe(true);
  });

  it("allows any state → cancelled only where defined", () => {
    expect(isValidTransition("confirmed", "cancelled")).toBe(true);
    expect(isValidTransition("packed", "cancelled")).toBe(true);
    // Delivered orders cannot be cancelled.
    expect(isValidTransition("delivered", "cancelled")).toBe(false);
  });

  it("rejects skipping states", () => {
    expect(isValidTransition("confirmed", "shipped")).toBe(false);
    expect(isValidTransition("confirmed", "delivered")).toBe(false);
  });

  it("rejects moving backwards", () => {
    expect(isValidTransition("shipped", "packed")).toBe(false);
    expect(isValidTransition("delivered", "shipped")).toBe(false);
  });

  it("returns the allowed next statuses", () => {
    expect(nextStatuses("shipped")).toEqual(["out_for_delivery"]);
    expect(nextStatuses("delivered")).toEqual(["return_requested"]);
    expect(nextStatuses("refunded")).toEqual([]);
  });
});
