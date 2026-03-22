/**
 * GET /api/orders/[orderNumber]
 *
 * Public endpoint — lets the frontend show order status after payment redirect.
 * Returns only safe, non-sensitive fields (no full address, no transactions).
 *
 * Response:
 *   200 { success: true, data: { orderNumber, paymentStatus, orderStatus, total, itemCount } }
 *   404 order not found
 */

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/utils/apiResponse";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;

  if (!orderNumber || typeof orderNumber !== "string") {
    return errorResponse("Order number is required.", 400);
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.toUpperCase() },
    include: {
      _count: { select: { items: true } },
    },
  });

  if (!order) {
    return errorResponse("Order not found.", 404);
  }

  return successResponse({
    orderNumber: order.orderNumber,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    total: order.total,
    currency: "RON",
    itemCount: order._count.items,
    createdAt: order.createdAt,
  });
}
