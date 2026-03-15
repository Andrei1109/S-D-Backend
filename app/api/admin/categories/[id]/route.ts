/**
 * GET    /api/admin/categories/[id]  — get single category
 * PUT    /api/admin/categories/[id]  — update category
 * DELETE /api/admin/categories/[id]  — delete category (only if no products)
 *
 * Protected by JWT middleware.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { getCategoryById, updateCategory, deleteCategory } from "@/services/categoryService";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

const updateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").optional(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only.")
    .optional(),
  description: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const category = await getCategoryById(id);
    if (!category) return errorResponse(ERRORS.NOT_FOUND("Category"), 404);
    return successResponse(category);
  } catch (err) {
    console.error("[GET /api/admin/categories/[id]]", err);
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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 400);
  }

  if (Object.keys(parsed.data).length === 0) {
    return errorResponse("No fields to update.", 400);
  }

  try {
    const updated = await updateCategory(id, parsed.data);
    if (!updated) return errorResponse(ERRORS.NOT_FOUND("Category"), 404);
    return successResponse(updated);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return errorResponse("A category with this slug already exists.", 409);
    }
    console.error("[PUT /api/admin/categories/[id]]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const deleted = await deleteCategory(id);
    if (!deleted) return errorResponse(ERRORS.NOT_FOUND("Category"), 404);
    return successResponse({ deleted: true });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Cannot delete")) {
      return errorResponse(err.message, 409);
    }
    console.error("[DELETE /api/admin/categories/[id]]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
