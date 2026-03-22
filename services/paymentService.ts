/**
 * services/paymentService.ts
 *
 * Netopia Payments integration.
 *
 * ─── HOW NETOPIA REST API v2 WORKS ────────────────────────────────────────
 *
 * 1. INITIATE payment
 *    POST https://secure.netopia-payments.com/payment/card/start   (production)
 *    POST https://secure.sandbox.netopia-payments.com/payment/card/start  (sandbox)
 *
 *    Request body (JSON):
 *    {
 *      config: { emailTemplate, notifyUrl, redirectUrl, language, cancelUrl },
 *      payment: { options: { installments, bonus }, instrument: {}, data: {} },
 *      order: {
 *        ntpID, posSignature, dateTime, description, orderID,
 *        amount, currency,
 *        billing: { email, phone, firstName, lastName, city, country, ... },
 *        shipping: { ... },
 *        products: [{ name, code, category, price, vat }]
 *      }
 *    }
 *
 *    Response: { payment: { paymentURL, ntpID, status, ... } }
 *    → Redirect customer to paymentURL.
 *
 * 2. IPN (Instant Payment Notification)
 *    Netopia POSTs to your NETOPIA_IPN_URL with JSON:
 *    { payment: { ntpID, orderID, status, amount, currency, ... } }
 *    Status codes: 3 = paid, 5 = cancelled, 6 = failed, 15 = pending
 *
 *    You MUST respond with HTTP 200 + JSON:
 *    { errorCode: 0 }   (or non-zero to signal an error to Netopia)
 *
 * ─── WHERE TO INSERT REAL DETAILS ─────────────────────────────────────────
 * Search for TODO:NETOPIA comments below.
 *
 * ─── DOCS ─────────────────────────────────────────────────────────────────
 * https://doc.netopia-payments.com/
 */

import { prisma } from "@/lib/prisma";
import { markOrderPaid, markOrderPaymentFailed, markOrderPaymentCancelled } from "@/services/orderService";
import { sendPaymentConfirmationEmail, sendOrderConfirmationEmail } from "@/services/emailService";
import type { NetopiaInitiateResult, NetopiaIpnPayload } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const isSandbox = process.env.NETOPIA_SANDBOX !== "false";

const NETOPIA_BASE_URL = isSandbox
  ? "https://secure.sandbox.netopia-payments.com"
  : "https://secure.netopia-payments.com";

const NETOPIA_START_ENDPOINT = `${NETOPIA_BASE_URL}/payment/card/start`;

// Netopia status codes (REST API v2)
const NETOPIA_STATUS = {
  CONFIRMED: 3,
  PENDING: 15,
  CANCELLED: 5,
  FAILED: 6,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Initiate payment
// ─────────────────────────────────────────────────────────────────────────────

export async function initiateNetopiaPayment(
  orderId: string
): Promise<NetopiaInitiateResult | null> {
  // Load order with customer + billing details
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error(`DEBUG: Order not found for id=${orderId}`);
  }
  if (order.paymentStatus !== "pending") {
    throw new Error(`DEBUG: Order ${orderId} paymentStatus=${order.paymentStatus}, expected pending`);
  }

  const posSignature = process.env.NETOPIA_POSID;
  const apiKey = process.env.NETOPIA_API_KEY;

  if (!posSignature || !apiKey) {
    throw new Error(
      "NETOPIA_POSID or NETOPIA_API_KEY is not configured. " +
        "Set them in your .env.local file."
    );
  }

  // Build redirect URLs with orderNumber so the return page knows which order to show
  const baseReturnUrl = process.env.NETOPIA_RETURN_URL ?? "";
  const returnUrl = `${baseReturnUrl}${baseReturnUrl.includes("?") ? "&" : "?"}orderNumber=${order.orderNumber}`;

  // Cancel URL → redirect to frontend homepage (pick the first https origin)
  const frontendUrls = (process.env.FRONTEND_URL ?? "http://localhost:3001").split(",").map(u => u.trim());
  const frontendUrl = frontendUrls.find(u => u.startsWith("https://")) ?? frontendUrls[0];
  const cancelUrl = process.env.NETOPIA_CANCEL_URL ?? frontendUrl;

  const requestBody = {
    config: {
      emailTemplate: "",
      notifyUrl: process.env.NETOPIA_IPN_URL ?? "",
      redirectUrl: returnUrl,
      language: "ro",
      cancelUrl,
    },
    payment: {
      options: {
        installments: 0,
        bonus: 0,
      },
      instrument: {},   // TODO:NETOPIA — for saved cards / tokens (leave empty for new card payments)
      data: {},         // TODO:NETOPIA — custom payment data if needed
    },
    order: {
      ntpID: "",        // empty on initiation — Netopia assigns the real ntpID in the response
      posSignature,
      dateTime: new Date().toISOString(),
      description: `Comanda ${order.orderNumber} - SD Beauty Hub`,
      orderID: order.orderNumber,   // your reference; Netopia also assigns ntpID
      amount: Number(order.total),
      currency: "RON",
      billing: {
        email: order.email,
        phone: order.phone,
        firstName: order.customerFirstName,
        lastName: order.customerLastName,
        city: order.city,
        country: 642,             // ISO 3166 numeric code for Romania
        countryName: "Romania",
        state: order.county,
        postalCode: order.postalCode ?? "",
        details: order.addressLine1,
      },
      shipping: {
        // TODO:NETOPIA — fill in actual shipping address; for now mirrors billing
        email: order.email,
        phone: order.phone,
        firstName: order.customerFirstName,
        lastName: order.customerLastName,
        city: order.city,
        country: 642,
        countryName: "Romania",
        state: order.county,
        postalCode: order.postalCode ?? "",
        details: order.addressLine1,
      },
      products: order.items.map((item) => ({
        name: item.productNameSnapshot,
        code: item.productId,
        category: "beauty",
        price: Number(item.productPriceSnapshot),
        vat: 19,          // Romanian VAT rate — adjust if products have different rates
      })),
    },
  };

  // TODO:NETOPIA — confirm the exact Authorization header format with Netopia support.
  // Some docs show "Basic <base64>", others show a custom header.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout

  let response: Response;
  try {
    response = await fetch(NETOPIA_START_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,      // TODO:NETOPIA — verify header name / format
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DEBUG: Netopia API ${response.status}: ${text}`);
  }

  // TODO:NETOPIA — verify the exact response shape in the docs
  const result = (await response.json()) as {
    payment?: { paymentURL?: string; ntpID?: string };
  };

  const paymentUrl = result?.payment?.paymentURL;
  if (!paymentUrl) {
    throw new Error(`DEBUG: No paymentURL in Netopia response: ${JSON.stringify(result)}`);
  }

  // Store ntpID on the pending transaction
  if (result.payment?.ntpID) {
    await prisma.transaction.updateMany({
      where: { orderId, status: "pending" },
      data: { providerTransactionId: result.payment.ntpID },
    });
  }

  return {
    paymentUrl,
    ntpID: result.payment?.ntpID,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Handle IPN (Instant Payment Notification)
// ─────────────────────────────────────────────────────────────────────────────

export interface IpnHandlerResult {
  /** HTTP status Netopia expects; always 200 even on business errors */
  httpStatus: 200;
  /** Body Netopia expects: { errorCode: 0 } on success */
  body: { errorCode: number; errorMessage?: string };
}

export async function handleNetopiaIpn(
  rawPayload: NetopiaIpnPayload
): Promise<IpnHandlerResult> {
  // TODO:NETOPIA — verify request signature before processing.
  // Netopia may send a header you must validate to ensure the request is genuine.
  // Insert signature verification here before doing anything else.

  // Log sanitised IPN metadata (no full payload — may contain sensitive card data)
  console.log("[Netopia IPN] Received callback at", new Date().toISOString());

  // Netopia REST API v2 sends: { order: { orderID }, payment: { ntpID, status, ... } }
  const paymentData = rawPayload.payment ?? rawPayload;
  const orderData = rawPayload.order ?? rawPayload;
  const ntpID = (paymentData.ntpID ?? rawPayload.ntpID) as string | undefined;
  const orderID = (orderData.orderID ?? paymentData.orderID ?? rawPayload.orderID) as string | undefined;
  const status = Number(paymentData.status ?? rawPayload.status ?? 0);
  const ipnAmount = Number(paymentData.amount ?? rawPayload.amount ?? 0);

  console.log("[Netopia IPN] Parsed → ntpID:", ntpID, "orderID:", orderID, "status:", status);

  if (!ntpID || !orderID) {
    console.error("[Netopia IPN] Missing ntpID or orderID:", rawPayload);
    return { httpStatus: 200, body: { errorCode: 1, errorMessage: "Missing identifiers" } };
  }

  // Find the order by orderNumber (the value you sent as orderID)
  const order = await prisma.order.findUnique({
    where: { orderNumber: String(orderID) },
    include: { transactions: true },
  });

  if (!order) {
    console.error("[Netopia IPN] Order not found for orderID:", orderID);
    // Still return 200 so Netopia does not keep retrying
    return { httpStatus: 200, body: { errorCode: 2, errorMessage: "Order not found" } };
  }

  // Idempotency guard: if already paid, ignore duplicate callbacks
  if (order.paymentStatus === "paid" && status === NETOPIA_STATUS.CONFIRMED) {
    console.warn("[Netopia IPN] Duplicate confirmed IPN for order:", order.orderNumber);
    return { httpStatus: 200, body: { errorCode: 0 } };
  }

  // Update transaction record with raw response
  await prisma.transaction.updateMany({
    where: { orderId: order.id, status: "pending" },
    data: {
      providerTransactionId: String(ntpID),
      rawResponse: rawPayload as object,
      status: mapNetopiaStatus(status),
    },
  });

  // ─── Amount validation: ensure IPN amount matches order total ───────
  if (status === NETOPIA_STATUS.CONFIRMED && ipnAmount > 0) {
    const orderTotal = Number(order.total);
    if (Math.abs(ipnAmount - orderTotal) > 0.01) {
      console.error(
        `[Netopia IPN] Amount mismatch! Order ${order.orderNumber}: expected ${orderTotal} RON, IPN sent ${ipnAmount} RON`
      );
      return { httpStatus: 200, body: { errorCode: 3, errorMessage: "Amount mismatch" } };
    }
  }

  // Update order based on Netopia status
  switch (status) {
    case NETOPIA_STATUS.CONFIRMED:
      await markOrderPaid(order.id);
      await sendPaymentConfirmationEmail(order.email, order.orderNumber);
      await sendOrderConfirmationEmail(order.email, order.orderNumber);
      break;

    case NETOPIA_STATUS.CANCELLED:
      await markOrderPaymentCancelled(order.id);
      break;

    case NETOPIA_STATUS.FAILED:
      await markOrderPaymentFailed(order.id);
      break;

    case NETOPIA_STATUS.PENDING:
      // Do nothing — payment is still in progress
      break;

    default:
      console.warn("[Netopia IPN] Unknown status code:", status);
  }

  return { httpStatus: 200, body: { errorCode: 0 } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mapNetopiaStatus(
  code: number
): "pending" | "success" | "failed" | "cancelled" {
  switch (code) {
    case NETOPIA_STATUS.CONFIRMED:
      return "success";
    case NETOPIA_STATUS.CANCELLED:
      return "cancelled";
    case NETOPIA_STATUS.FAILED:
      return "failed";
    default:
      return "pending";
  }
}
