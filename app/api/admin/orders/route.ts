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
import { paginatedResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 20));
    const search = sp.get("search") ?? undefined;
    const status = sp.get("status") ?? undefined;
    const payment = sp.get("payment") ?? undefined;

    const result = await getAllOrders({ page, limit, search, status, payment });
    return paginatedResponse(result.data, result.pagination);
  } catch (err) {
    console.error("[GET /api/admin/orders]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
