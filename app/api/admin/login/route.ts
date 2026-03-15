/**
 * POST /api/admin/login
 *
 * Exchange email + password for a JWT.
 *
 * Body: { email, password }
 *
 * Response:
 *   200 { success: true, data: { token, admin: { id, email, name } } }
 *   401 { success: false, error: "Invalid credentials." }
 */

import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAdminToken } from "@/lib/auth";
import { adminLoginSchema } from "@/validators/adminValidator";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join("; ");
    return errorResponse(message, 400);
  }

  const { email, password } = parsed.data;

  try {
    const admin = await prisma.admin.findUnique({ where: { email } });

    // Use a constant-time comparison to prevent timing attacks.
    // Even if the admin doesn't exist, we still run bcrypt.compare against
    // a dummy hash so the response time is the same.
    const dummyHash = "$2b$12$invalidsaltnottobeusedasarealhashatallXXXXXXXXXXXXXX";
    const hashToCompare = admin?.passwordHash ?? dummyHash;

    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!admin || !passwordMatch) {
      return errorResponse("Invalid credentials.", 401);
    }

    const token = await signAdminToken({
      sub: admin.id,
      email: admin.email,
    });

    return successResponse({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch (err) {
    console.error("[POST /api/admin/login]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
