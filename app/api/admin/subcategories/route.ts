/**
 * GET  /api/admin/subcategories  — list subcategories (optional ?categoryId filter)
 * POST /api/admin/subcategories  — create a new subcategory
 *
 * Protected by JWT middleware.
 */

import { type NextRequest } from "next/server";
import {
  getAllSubcategories,
  getSubcategoriesByCategoryId,
  createSubcategory,
} from "@/services/subcategoryService";
import { createSubcategorySchema } from "@/validators/subcategoryValidator";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

export async function GET(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get("categoryId");

    const subcategories = categoryId
      ? await getSubcategoriesByCategoryId(categoryId)
      : await getAllSubcategories();

    return successResponse(subcategories);
  } catch (err) {
    console.error("[GET /api/admin/subcategories]", err);
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

  const parsed = createSubcategorySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 400);
  }

  try {
    const subcategory = await createSubcategory(parsed.data);
    return successResponse(subcategory, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return errorResponse("A subcategory with this slug already exists.", 409);
    }
    console.error("[POST /api/admin/subcategories]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
