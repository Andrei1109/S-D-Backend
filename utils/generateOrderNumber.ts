/**
 * utils/generateOrderNumber.ts
 *
 * Generates a human-readable, unique-enough order number.
 * Format: SD-YYYYMMDD-XXXXXXXX  (e.g. SD-20250315-A3F9K2HB)
 *
 * Uses crypto.getRandomValues for unpredictable randomness (prevents
 * order number enumeration). Uniqueness is enforced by the database
 * UNIQUE constraint on Order.orderNumber. On collision the service
 * layer should retry.
 */

import { randomBytes } from "crypto";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1 to avoid confusion

function randomChars(n: number): string {
  const bytes = randomBytes(n);
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}

export function generateOrderNumber(): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  return `SD-${datePart}-${randomChars(8)}`; // 8 chars = ~40 bits of entropy
}
