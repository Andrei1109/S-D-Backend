/**
 * GET   /api/admin/orders/:id  — get full order detail with items and transactions
 * PATCH /api/admin/orders/:id  — update order status manually
 *
 * Allowed manual updates (see orderValidator.ts for constraints):
 *   - orderStatus: any valid OrderStatus value
 *   - paymentStatus: only "cancelled" (paid status comes from IPN only)
 */

import { type NextRequest } from "next/server";
import { getOrderById, updateOrderStatus } from "@/services/orderService";
import { sendOrderStatusUpdatedEmail } from "@/services/emailService";
import { updateOrderStatusSchema } from "@/validators/orderValidator";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const order = await getOrderById(id);
    if (!order) return errorResponse(ERRORS.NOT_FOUND("Order"), 404);
    return successResponse(order);
  } catch (err) {
    console.error("[GET /api/admin/orders/[id]]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join("; ");
    return errorResponse(message, 400);
  }

  if (!parsed.data.orderStatus && !parsed.data.paymentStatus) {
    return errorResponse("Provide at least one field to update: orderStatus or paymentStatus.", 400);
  }

  try {
    const order = await getOrderById(id);
    if (!order) return errorResponse(ERRORS.NOT_FOUND("Order"), 404);

    const updated = await updateOrderStatus(id, parsed.data);

    // Notify customer when order status changes
    if (parsed.data.orderStatus && parsed.data.orderStatus !== order.orderStatus) {
      await sendOrderStatusUpdatedEmail(
        order.email,
        order.orderNumber,
        parsed.data.orderStatus
      );
    }

    return successResponse(updated);
  } catch (err) {
    console.error("[PATCH /api/admin/orders/[id]]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
