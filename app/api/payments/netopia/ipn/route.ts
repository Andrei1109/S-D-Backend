/**
 * POST /api/payments/netopia/ipn
 *
 * Instant Payment Notification (IPN / webhook) endpoint for Netopia.
 *
 * Netopia calls this URL after every payment status change.
 * This endpoint MUST:
 *   - Always return HTTP 200 (even on business errors)
 *   - Return { errorCode: 0 } on success
 *   - Never throw an unhandled exception
 *
 * The URL of this endpoint must be registered in the Netopia merchant panel
 * as the "Notify URL" and must be publicly accessible.
 *
 * For local development, expose it with:
 *   npx localtunnel --port 3000   (or ngrok, cloudflare tunnel, etc.)
 */

import { type NextRequest, NextResponse } from "next/server";
import { handleNetopiaIpn } from "@/services/paymentService";
import type { NetopiaIpnPayload } from "@/types";

export async function POST(request: NextRequest) {
  let payload: NetopiaIpnPayload = {};

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      payload = (await request.json()) as NetopiaIpnPayload;
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      // Netopia may POST form-encoded data depending on version / config
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        payload[key] = value;
      }
    } else {
      // Fallback: try JSON, then raw text
      const text = await request.text();
      try {
        payload = JSON.parse(text) as NetopiaIpnPayload;
      } catch {
        // If it's not JSON, log it and treat as empty (Netopia verification will fail)
        console.warn("[Netopia IPN] Unrecognised content-type and body:", contentType, text);
      }
    }
  } catch (err) {
    console.error("[Netopia IPN] Failed to parse request body:", err);
  }

  try {
    const result = await handleNetopiaIpn(payload);
    return NextResponse.json(result.body, { status: result.httpStatus });
  } catch (err) {
    // Never let an exception propagate — Netopia expects 200
    console.error("[Netopia IPN] Unhandled error:", err);
    return NextResponse.json({ errorCode: 99, errorMessage: "Internal error" }, { status: 200 });
  }
}
