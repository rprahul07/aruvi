export type Money = number; // rupees, 2dp — never floating-point cents math beyond this boundary

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
}

export interface AttributeValue {
  id: string;
  attributeId: string;
  attributeName: string;
  attributeSlug: string;
  value: string;
  slug: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  isCover: boolean;
  variantId: string | null;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  price: Money;
  salePrice: Money | null;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number; // stockQuantity - reservedQuantity, computed
  lowStockThreshold: number;
  isActive: boolean;
  attributeValues: AttributeValue[];
  images: ProductImage[];
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  basePrice: Money;
  salePrice: Money | null;
  coverImage: ProductImage | null;
  category: Pick<Category, "id" | "name" | "slug"> | null;
  ratingAverage: number | null;
  ratingCount: number;
  inStock: boolean;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  material: string | null;
  metal: string | null;
  plating: string | null;
  stone: string | null;
  occasion: string | null;
  style: string | null;
  careInstructions: string | null;
  taxPercent: number;
  images: ProductImage[];
  variants: ProductVariant[];
  collections: Pick<Collection, "id" | "name" | "slug">[];
}

export interface CartItemView {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantLabel: string; // e.g. "Size 7 · Rose Gold"
  image: string | null;
  unitPrice: Money; // authoritative price at read time (sale price if active)
  quantity: number;
  availableQuantity: number;
  lineTotal: Money;
}

export interface CartView {
  id: string;
  items: CartItemView[];
  subtotal: Money;
  discount: Money;
  tax: Money;
  shipping: Money;
  total: Money;
  currency: string;
  couponCode: string | null;
  itemCount: number;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  alternatePhone: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  district: string | null;
  state: string;
  postalCode: string;
  country: string;
  addressType: "home" | "work" | "other";
  isDefault: boolean;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "returned"
  | "refund_pending"
  | "refunded";

export type PaymentStatus =
  | "created"
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface OrderItemView {
  id: string;
  productId: string | null;
  productName: string;
  variantLabel: string | null;
  sku: string;
  imageUrl: string | null;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: Money;
  discount: Money;
  tax: Money;
  shipping: Money;
  total: Money;
  currency: string;
  items: OrderItemView[];
  shippingAddress: Omit<Address, "id" | "isDefault" | "addressType">;
  createdAt: string;
}
