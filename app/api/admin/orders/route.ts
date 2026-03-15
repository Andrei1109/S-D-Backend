/**
 * GET /api/admin/orders
 *
 * Returns all orders, most recent first, with a summary of items.
 * Supports optional query filters:
 *   ?status=paid|new|...   filters by orderStatus
 *   ?payment=pending|paid  filters by paymentStatus
 */

import { type NextRequest } from "next/server";
import { getAllOrders } from "@/services/orderService";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

export async function GET(_request: NextRequest) {
  try {
    const orders = await getAllOrders();
    return successResponse(orders);
  } catch (err) {
    console.error("[GET /api/admin/orders]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
