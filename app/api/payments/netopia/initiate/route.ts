/**
 * POST /api/payments/netopia/initiate
 *
 * Initiates a Netopia payment for an existing pending order.
 *
 * Body: { orderId: string }
 *
 * Flow:
 *   1. Validate the orderId
 *   2. Call Netopia API to start the payment session
 *   3. Return paymentUrl → frontend redirects the customer there
 *
 * Response:
 *   200 { success: true, data: { paymentUrl, ntpID } }
 *   404 order not found / already paid
 *   500 Netopia API error
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { initiateNetopiaPayment } from "@/services/paymentService";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

const bodySchema = z.object({
  orderId: z.string().cuid("Invalid order ID."),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 400);
  }

  try {
    const result = await initiateNetopiaPayment(parsed.data.orderId);

    if (!result) {
      return errorResponse(
        "Could not initiate payment. The order may not exist or has already been paid.",
        404
      );
    }

    return successResponse(result);
  } catch (err) {
    console.error("[POST /api/payments/netopia/initiate]", err);

    // Surface ALL errors clearly so we can debug in production
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Payment initiation error: ${message}`, 503);
  }
}
