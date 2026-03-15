/**
 * lib/prisma.ts
 *
 * Singleton Prisma client.
 *
 * In development, hot-reload creates new module instances, which would exhaust
 * the connection pool. We attach the client to the global object to reuse it
 * across reloads. In production a fresh instance is created once.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
