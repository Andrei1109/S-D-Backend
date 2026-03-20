/**
 * utils/apiResponse.ts
 *
 * Standardised JSON response helpers.
 *
 * All API routes return one of these shapes:
 *   Success: { success: true,  data: <payload> }
 *   Error:   { success: false, error: "<message>" }
 */

import { NextResponse } from "next/server";

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function paginatedResponse<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number; totalPages: number },
  status = 200
): NextResponse {
  return NextResponse.json({ success: true, data, pagination }, { status });
}

export function errorResponse(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export const ERRORS = {
  UNAUTHORIZED: "Unauthorized.",
  FORBIDDEN: "Forbidden.",
  NOT_FOUND: (resource = "Resource") => `${resource} not found.`,
  INVALID_PAYLOAD: "Invalid request payload.",
  INTERNAL: "An unexpected error occurred. Please try again later.",
} as const;
