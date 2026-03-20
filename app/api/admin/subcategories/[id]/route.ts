/**
 * PUT    /api/admin/subcategories/[id]  — update subcategory
 * DELETE /api/admin/subcategories/[id]  — delete subcategory (only if no products)
 *
 * Protected by JWT middleware.
 */

import { type NextRequest } from "next/server";
import {
  getSubcategoryById,
  updateSubcategory,
  deleteSubcategory,
} from "@/services/subcategoryService";
import { updateSubcategorySchema } from "@/validators/subcategoryValidator";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const subcategory = await getSubcategoryById(id);
    if (!subcategory) return errorResponse(ERRORS.NOT_FOUND("Subcategory"), 404);
    return successResponse(subcategory);
  } catch (err) {
    console.error("[GET /api/admin/subcategories/[id]]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsed = updateSubcategorySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 400);
  }

  if (Object.keys(parsed.data).length === 0) {
    return errorResponse("No fields to update.", 400);
  }

  try {
    const updated = await updateSubcategory(id, parsed.data);
    if (!updated) return errorResponse(ERRORS.NOT_FOUND("Subcategory"), 404);
    return successResponse(updated);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return errorResponse("A subcategory with this slug already exists.", 409);
    }
    console.error("[PUT /api/admin/subcategories/[id]]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const deleted = await deleteSubcategory(id);
    if (!deleted) return errorResponse(ERRORS.NOT_FOUND("Subcategory"), 404);
    return successResponse({ deleted: true });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Cannot delete")) {
      return errorResponse(err.message, 409);
    }
    console.error("[DELETE /api/admin/subcategories/[id]]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
