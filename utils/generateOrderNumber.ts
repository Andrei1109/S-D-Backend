/**
 * utils/generateOrderNumber.ts
 *
 * Generates a human-readable, unique-enough order number.
 * Format: SD-YYYYMMDD-XXXXXX  (e.g. SD-20250315-A3F9K2)
 *
 * Not cryptographically guaranteed unique — uniqueness is enforced by the
 * database UNIQUE constraint on Order.orderNumber.
 * On collision the service layer should retry.
 */

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1 to avoid confusion

function randomChars(n: number): string {
  return Array.from({ length: n }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
}

export function generateOrderNumber(): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  return `SD-${datePart}-${randomChars(6)}`;
}
