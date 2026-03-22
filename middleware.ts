/**
 * middleware.ts
 *
 * 1. Adds CORS headers to all /api/* responses and handles OPTIONS preflight.
 * 2. Protects all /api/admin/* routes except /api/admin/login with JWT.
 * 3. Adds security headers to all responses.
 * 4. In-memory rate limiting on all public + sensitive endpoints.
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

// ─── Rate limiting (in-memory, per-IP, per-bucket) ─────────────────────────
//
// Each "bucket" has its own limits.  Map key = "bucket:ip"
//
// Buckets:
//   login      →  8 req / 15 min  (brute-force protection)
//   checkout   → 10 req /  1 min  (order spam)
//   ipn        → 60 req /  1 min  (webhook flood)
//   order-lookup → 20 req / 1 min (enumeration)
//   public-read  → 60 req / 1 min (scraping products/categories)
//   admin-write  → 30 req / 1 min (admin mutations)

interface RateBucket {
  windowMs: number;
  maxRequests: number;
  message: string;
}

const RATE_BUCKETS: Record<string, RateBucket> = {
  login: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 8,
    message: "Prea multe încercări de autentificare. Reîncearcă peste 15 minute.",
  },
  checkout: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: "Prea multe comenzi într-un timp scurt. Așteaptă un minut.",
  },
  ipn: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    message: "Too many requests.",
  },
  "order-lookup": {
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: "Prea multe cereri. Reîncearcă într-un minut.",
  },
  "public-read": {
    windowMs: 60 * 1000,
    maxRequests: 60,
    message: "Prea multe cereri. Reîncearcă într-un minut.",
  },
  "admin-write": {
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: "Prea multe cereri. Reîncearcă într-un minut.",
  },
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(bucket: string, ip: string): boolean {
  const config = RATE_BUCKETS[bucket];
  if (!config) return false;

  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return false;
  }

  entry.count++;
  return entry.count > config.maxRequests;
}

function getRateLimitMessage(bucket: string): string {
  return RATE_BUCKETS[bucket]?.message ?? "Prea multe cereri.";
}

// Periodic cleanup to prevent unbounded growth (runs on every request, cheap check)
let lastCleanup = Date.now();
function cleanupRateLimits() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // cleanup at most every minute
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}

/**
 * Determine which rate-limit bucket applies to this request.
 * Returns null if no rate limiting needed (e.g. admin GET with valid JWT).
 */
function getRateBucket(pathname: string, method: string): string | null {
  // Login — strictest
  if (pathname === "/api/admin/login" && method === "POST") return "login";

  // Checkout
  if (pathname === "/api/checkout" && method === "POST") return "checkout";

  // Netopia IPN webhook
  if (pathname === "/api/payments/netopia/ipn" && method === "POST") return "ipn";

  // Public order lookup (GET /api/orders/xxx)
  if (pathname.startsWith("/api/orders/") && method === "GET") return "order-lookup";

  // Public product/category reads (not admin)
  if (
    !pathname.startsWith("/api/admin") &&
    (pathname.startsWith("/api/products") || pathname.startsWith("/api/categories")) &&
    method === "GET"
  ) return "public-read";

  // Admin write operations (POST, PUT, PATCH, DELETE)
  if (
    pathname.startsWith("/api/admin") &&
    !PUBLIC_ADMIN_PATHS.includes(pathname) &&
    method !== "GET"
  ) return "admin-write";

  return null;
}

// ─── JWT ────────────────────────────────────────────────────────────────────

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or too short (min 32 chars).");
  }
  return new TextEncoder().encode(secret);
}

// ─── CORS ───────────────────────────────────────────────────────────────────

function corsHeaders(request: NextRequest): HeadersInit {
  const allowedOrigins = (process.env.FRONTEND_URL ?? "*")
    .split(",")
    .map((o) => o.trim());

  const requestOrigin = request.headers.get("origin") ?? "";

  // Reject unrecognised origins instead of falling back to first allowed origin
  const origin =
    allowedOrigins.includes("*") ? "*"
    : allowedOrigins.includes(requestOrigin) ? requestOrigin
    : "";

  if (!origin) {
    return {
      "Access-Control-Allow-Origin": "",
      "Access-Control-Allow-Methods": "",
      "Access-Control-Allow-Headers": "",
    };
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": origin !== "*" ? "true" : "false",
  };
}

// ─── Security headers ──────────────────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

function withHeaders(response: NextResponse, request: NextRequest): NextResponse {
  // CORS
  const cors = corsHeaders(request);
  Object.entries(cors).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Security
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// ─── Middleware ─────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  cleanupRateLimits();

  // Handle CORS preflight for all API routes
  if (request.method === "OPTIONS") {
    const headers = { ...corsHeaders(request), ...SECURITY_HEADERS };
    return new NextResponse(null, { status: 204, headers });
  }

  // ─── Rate limiting (all buckets) ────────────────────────────────────
  const bucket = getRateBucket(pathname, request.method);
  if (bucket) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";

    if (isRateLimited(bucket, ip)) {
      return withHeaders(
        NextResponse.json(
          { success: false, error: getRateLimitMessage(bucket) },
          { status: 429 }
        ),
        request
      );
    }
  }

  // Only guard admin routes; pass through public routes with headers
  if (!pathname.startsWith("/api/admin")) {
    return withHeaders(NextResponse.next(), request);
  }

  // Allow login through without a token
  if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
    return withHeaders(NextResponse.next(), request);
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) {
    return withHeaders(
      NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 }),
      request
    );
  }

  try {
    await jwtVerify(token, getSecret());
    return withHeaders(NextResponse.next(), request);
  } catch {
    return withHeaders(
      NextResponse.json({ success: false, error: "Invalid or expired token." }, { status: 401 }),
      request
    );
  }
}

export const config = {
  // Apply to all API routes (CORS) – JWT guard only kicks in for /api/admin/*
  matcher: "/api/:path*",
};
