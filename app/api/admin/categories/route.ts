/**
 * GET  /api/admin/categories  — list all categories
 * POST /api/admin/categories  — create a new category
 *
 * Protected by JWT middleware.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { getAllCategories, createCategory } from "@/services/categoryService";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

const createSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only."),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const categories = await getAllCategories();
    return successResponse(categories);
  } catch (err) {
    console.error("[GET /api/admin/categories]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 400);
  }

  try {
    const category = await createCategory(parsed.data);
    return successResponse(category, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return errorResponse("A category with this slug already exists.", 409);
    }
    console.error("[POST /api/admin/categories]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
