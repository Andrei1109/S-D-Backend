/**
 * PUT    /api/admin/products/:id  — update a product (partial)
 * DELETE /api/admin/products/:id  — delete a product
 *
 * Note on DELETE:
 *   Hard-delete is safe because OrderItem snapshots the product name and price.
 *   Historical orders are unaffected.
 */

import { type NextRequest } from "next/server";
import { getProductByIdAdmin, updateProduct, deleteProduct } from "@/services/productService";
import { updateProductSchema } from "@/validators/productValidator";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const product = await getProductByIdAdmin(id);
    if (!product) return errorResponse(ERRORS.NOT_FOUND("Product"), 404);
    return successResponse(product);
  } catch (err) {
    console.error("[GET /api/admin/products/[id]]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join("; ");
    return errorResponse(message, 400);
  }

  try {
    const updated = await updateProduct(id, parsed.data);
    if (!updated) return errorResponse(ERRORS.NOT_FOUND("Product"), 404);
    return successResponse(updated);
  } catch (err: unknown) {
    if (isPrismaUniqueError(err)) {
      return errorResponse("A product with this slug already exists.", 409);
    }
    console.error("[PUT /api/admin/products/[id]]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const deleted = await deleteProduct(id);
    if (!deleted) return errorResponse(ERRORS.NOT_FOUND("Product"), 404);
    return successResponse({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/admin/products/[id]]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}
