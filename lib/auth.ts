/**
 * lib/auth.ts
 *
 * JWT helpers using `jose` — works in both Node.js route handlers
 * and the Next.js Edge middleware.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { AdminJwtPayload } from "@/types";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or too short (min 32 chars).");
  }
  return new TextEncoder().encode(secret);
};

const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

/**
 * Sign a JWT for an admin session.
 */
export async function signAdminToken(payload: AdminJwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret());
}

/**
 * Verify and decode a JWT. Returns null if invalid/expired.
 */
export async function verifyAdminToken(
  token: string
): Promise<(AdminJwtPayload & JWTPayload) | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as AdminJwtPayload & JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Extract the Bearer token from an Authorization header string.
 * Returns null if the header is missing or malformed.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}
