/**
 * services/orderService.ts
 *
 * Read and update operations for orders (admin use).
 * Order creation lives in checkoutService to keep the checkout flow isolated.
 */

import { prisma } from "@/lib/prisma";
import type { UpdateOrderStatusInput } from "@/validators/orderValidator";

const orderWithItems = {
  include: {
    items: {
      include: { product: { select: { id: true, name: true, mainImage: true } } },
    },
    transactions: {
      orderBy: { createdAt: "desc" as const },
      take: 10,
    },
  },
} as const;

// ─────────────────────────────────────────────
// Admin queries
// ─────────────────────────────────────────────

export async function getAllOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: { select: { quantity: true, lineTotal: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    ...orderWithItems,
  });
}

export async function getOrderByNumber(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    ...orderWithItems,
  });
}

/**
 * Admin can manually update order status and/or cancel a payment.
 * Payment status can only be set to 'cancelled' from the admin panel;
 * setting it to 'paid' is reserved for the IPN callback exclusively.
 */
export async function updateOrderStatus(
  id: string,
  data: UpdateOrderStatusInput
) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return null;

  return prisma.order.update({
    where: { id },
    data: {
      ...(data.orderStatus !== undefined && { orderStatus: data.orderStatus }),
      ...(data.paymentStatus !== undefined && { paymentStatus: data.paymentStatus }),
    },
  });
}

// ─────────────────────────────────────────────
// Payment callback helpers (called from payment service)
// ─────────────────────────────────────────────

export async function markOrderPaid(orderId: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "paid", orderStatus: "paid" },
  });
}

export async function markOrderPaymentFailed(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.paymentStatus === "failed") return null; // idempotent

    // Restore reserved stock
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    return tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "failed" },
    });
  });
}

export async function markOrderPaymentCancelled(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.paymentStatus === "cancelled") return null; // idempotent

    // Restore reserved stock
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    return tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "cancelled" },
    });
  });
}
