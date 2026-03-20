/**
 * types/index.ts
 *
 * Shared TypeScript types and re-exports of Prisma enums.
 * Keeps business types in one place so they are easy to find and extend.
 */

export type {
  Admin,
  Category,
  Subcategory,
  Product,
  Order,
  OrderItem,
  Transaction,
} from "@prisma/client";

export {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  TransactionStatus,
} from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Checkout
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckoutItem {
  productId: string;
  quantity: number;
}

export interface CheckoutPayload {
  customerFirstName: string;
  customerLastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county: string;
  postalCode?: string;
  notes?: string;
  items: CheckoutItem[];
  paymentMethod: "NETOPIA";
}

// ─────────────────────────────────────────────────────────────────────────────
// Netopia
// ─────────────────────────────────────────────────────────────────────────────

export interface NetopiaInitiateResult {
  paymentUrl: string;
  ntpID?: string; // Netopia's internal transaction identifier
}

export interface NetopiaIpnPayload {
  /** REST API v2 wraps payment data under "payment" key */
  payment?: {
    ntpID?: string;
    orderID?: string;
    status?: number | string;
    amount?: number | string;
    currency?: string;
    [key: string]: unknown;
  };
  /** REST API v2 wraps order data under "order" key */
  order?: {
    orderID?: string;
    [key: string]: unknown;
  };
  /** Some gateway versions / form-encoded payloads use a flat structure */
  ntpID?: string;
  orderID?: string;
  status?: string | number;
  errorCode?: string;
  errorMessage?: string;
  amount?: string | number;
  currency?: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// API response envelope
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────────────────────
// Admin JWT payload
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminJwtPayload {
  sub: string;   // admin id
  email: string;
  iat?: number;
  exp?: number;
}
