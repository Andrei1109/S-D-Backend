/**
 * middleware.ts
 *
 * 1. Adds CORS headers to all /api/* responses and handles OPTIONS preflight.
 * 2. Protects all /api/admin/* routes except /api/admin/login with JWT.
 *
 * Runs on the Next.js Edge runtime, so we use `jose` (not jsonwebtoken).
 *
 * The client must send:
 *   Authorization: Bearer <jwt>
 *
 * Set FRONTEND_URL in your .env to restrict the allowed origin (defaults to *).
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_ADMIN_PATHS = ["/api/admin/login"];

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

function corsHeaders(request: NextRequest): HeadersInit {
  const allowedOrigins = (process.env.FRONTEND_URL ?? "*")
    .split(",")
    .map((o) => o.trim());

  const requestOrigin = request.headers.get("origin") ?? "";
  const origin =
    allowedOrigins.includes("*") ? "*"
    : allowedOrigins.includes(requestOrigin) ? requestOrigin
    : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": origin !== "*" ? "true" : "false",
  };
}

function withCors(response: NextResponse, request: NextRequest): NextResponse {
  const headers = corsHeaders(request);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight for all API routes
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
  }

  // Only guard admin routes; pass through public routes with CORS headers
  if (!pathname.startsWith("/api/admin")) {
    return withCors(NextResponse.next(), request);
  }

  // Allow login through without a token
  if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
    return withCors(NextResponse.next(), request);
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) {
    return withCors(
      NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 }),
      request
    );
  }

  try {
    await jwtVerify(token, getSecret());
    return withCors(NextResponse.next(), request);
  } catch {
    return withCors(
      NextResponse.json({ success: false, error: "Invalid or expired token." }, { status: 401 }),
      request
    );
  }
}

export const config = {
  // Apply to all API routes (CORS) – JWT guard only kicks in for /api/admin/*
  matcher: "/api/:path*",
};
