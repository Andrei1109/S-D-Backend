/**
 * services/orderService.ts
 *
 * Read and update operations for orders (admin use).
 * Order creation lives in checkoutService to keep the checkout flow isolated.
 */

import { prisma } from "@/lib/prisma";
import type { UpdateOrderStatusInput } from "@/validators/orderValidator";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface OrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  payment?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const orderWithItems = {
  include: {
    items: {
      include: { product: { select: { id: true, name: true, slug: true, mainImage: true, price: true, stock: true, isActive: true } } },
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

export async function getAllOrders(
  params: OrderListParams = {}
): Promise<PaginatedResult<unknown>> {
  const { page = 1, limit = 20, search, status, payment } = params;
  const skip = (page - 1) * limit;

  const searchWords = search?.trim().split(/\s+/).filter(Boolean) ?? [];
  const searchCondition = searchWords.length > 0 ? {
    AND: searchWords.map(word => ({
      OR: [
        { orderNumber: { contains: word, mode: 'insensitive' as const } },
        { email: { contains: word, mode: 'insensitive' as const } },
        { customerFirstName: { contains: word, mode: 'insensitive' as const } },
        { customerLastName: { contains: word, mode: 'insensitive' as const } },
      ],
    })),
  } : {};

  const where = {
    ...(status ? { orderStatus: status as OrderStatus } : {}),
    ...(payment ? { paymentStatus: payment as PaymentStatus } : {}),
    ...searchCondition,
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: { select: { quantity: true, lineTotal: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
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
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return null;

    // For online payments (NETOPIA), stock was not decremented at order creation.
    // Decrement it now that payment is confirmed.
    if (order.paymentMethod === "NETOPIA") {
      for (const item of order.items) {
        if (!item.productId) continue; // product was deleted
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "paid", orderStatus: "paid" },
    });
  });
}

export async function markOrderPaymentFailed(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.paymentStatus === "failed") return null; // idempotent

    // Restore stock only for RAMBURS orders — NETOPIA stock was never decremented
    // (it is only decremented upon IPN confirmation, which didn't happen here).
    if (order.paymentMethod === "RAMBURS") {
      for (const item of order.items) {
        if (!item.productId) continue; // product was deleted
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
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

    // Restore stock only for RAMBURS orders — NETOPIA stock was never decremented
    // (it is only decremented upon IPN confirmation, which didn't happen here).
    if (order.paymentMethod === "RAMBURS") {
      for (const item of order.items) {
        if (!item.productId) continue; // product was deleted
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "cancelled" },
    });
  });
}
