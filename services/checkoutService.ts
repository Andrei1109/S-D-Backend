/**
 * services/checkoutService.ts
 *
 * Core checkout logic.
 *
 * Rules:
 *  - Prices are ALWAYS recalculated from the database. Frontend prices are ignored.
 *  - Inactive products are rejected.
 *  - Products with insufficient stock are rejected.
 *  - A Transaction record is created alongside the Order (status: pending).
 *  - Stock is decremented only after payment confirmation (IPN).
 *    For this MVP, stock is reserved at order creation to prevent overselling.
 */

import { prisma } from "@/lib/prisma";
import { getProductsByIds } from "@/services/productService";
import { generateOrderNumber } from "@/utils/generateOrderNumber";
import type { CheckoutInput } from "@/validators/checkoutValidator";

const SHIPPING_COST = parseFloat(process.env.SHIPPING_COST_RON ?? "25");
const FREE_SHIPPING_THRESHOLD = parseFloat(
  process.env.FREE_SHIPPING_THRESHOLD_RON ?? "250"
);

export interface CheckoutResult {
  orderId: string;
  orderNumber: string;
  total: number;
}

export interface CheckoutValidationError {
  type: "VALIDATION_ERROR";
  message: string;
}

export type CheckoutOutcome = CheckoutResult | CheckoutValidationError;

export function isCheckoutError(
  result: CheckoutOutcome
): result is CheckoutValidationError {
  return (result as CheckoutValidationError).type === "VALIDATION_ERROR";
}

// ─────────────────────────────────────────────

export async function processCheckout(
  input: CheckoutInput
): Promise<CheckoutOutcome> {
  // 1. Load products from DB (single query)
  const requestedIds = input.items.map((i) => i.productId);
  const products = await getProductsByIds(requestedIds);
  const productMap = new Map(products.map((p) => [p.id, p]));

  // 2. Validate each item
  for (const item of input.items) {
    const product = productMap.get(item.productId);

    if (!product) {
      return {
        type: "VALIDATION_ERROR",
        message: `Product not found: ${item.productId}`,
      };
    }
    if (!product.isActive) {
      return {
        type: "VALIDATION_ERROR",
        message: `Product "${product.name}" is no longer available.`,
      };
    }
    if (product.stock < item.quantity) {
      return {
        type: "VALIDATION_ERROR",
        message: `Insufficient stock for "${product.name}". Available: ${product.stock}.`,
      };
    }
  }

  // 3. Calculate totals (all arithmetic in JS Number is fine for display;
  //    Prisma stores as Decimal)
  let subtotal = 0;
  const orderItemsData = input.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const unitPrice = Number(product.price);
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;

    return {
      productId: item.productId,
      productNameSnapshot: product.name,
      productPriceSnapshot: unitPrice,
      quantity: item.quantity,
      lineTotal,
    };
  });

  const shippingCost =
    FREE_SHIPPING_THRESHOLD > 0 && subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_COST;

  const total = subtotal + shippingCost;

  // 4. Generate order number (retry once on collision — rare but possible)
  let orderNumber = generateOrderNumber();
  const existing = await prisma.order.findUnique({ where: { orderNumber } });
  if (existing) {
    orderNumber = generateOrderNumber();
  }

  // 5. Create Order + OrderItems + Transaction atomically
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        customerFirstName: input.customerFirstName,
        customerLastName: input.customerLastName,
        email: input.email,
        phone: input.phone,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        city: input.city,
        county: input.county,
        postalCode: input.postalCode ?? null,
        notes: input.notes ?? null,
        subtotal,
        shippingCost,
        total,
        paymentMethod: input.paymentMethod,
        paymentStatus: "pending",
        orderStatus: "new",
        items: {
          create: orderItemsData,
        },
        transactions: {
          create: {
            provider: "NETOPIA",
            amount: total,
            currency: "RON",
            status: "pending",
          },
        },
      },
    });

    // Reserve stock for each item
    for (const item of input.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return newOrder;
  });

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    total,
  };
}
