/**
 * POST /api/checkout
 *
 * Validates the cart, creates a pending order, reserves stock,
 * and returns the orderId for the subsequent payment initiation step.
 *
 * Body: CheckoutInput (see validators/checkoutValidator.ts)
 *
 * Response:
 *   201 { success: true, data: { orderId, orderNumber, total } }
 *   400 { success: false, error: "<validation message>" }
 */

import { type NextRequest } from "next/server";
import { checkoutSchema } from "@/validators/checkoutValidator";
import { processCheckout, isCheckoutError } from "@/services/checkoutService";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join("; ");
    return errorResponse(message, 400);
  }

  try {
    const result = await processCheckout(parsed.data);

    if (isCheckoutError(result)) {
      return errorResponse(result.message, 422);
    }

    return successResponse(result, 201);
  } catch (err) {
    console.error("[POST /api/checkout]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
