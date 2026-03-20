/**
 * GET  /api/admin/products   — list all products (incl. inactive)
 * POST /api/admin/products   — create a new product
 *
 * All routes protected by middleware.ts (JWT required).
 */

import { type NextRequest } from "next/server";
import { getAllProductsAdmin, createProduct } from "@/services/productService";
import { createProductSchema } from "@/validators/productValidator";
import { successResponse, paginatedResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 20));
    const search = sp.get("search") ?? undefined;
    const categorySlug = sp.get("category") ?? undefined;
    const subcategorySlug = sp.get("subcategory") ?? undefined;

    const result = await getAllProductsAdmin({ page, limit, search, categorySlug, subcategorySlug });
    return paginatedResponse(result.data, result.pagination);
  } catch (err) {
    console.error("[GET /api/admin/products]", err);
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

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join("; ");
    return errorResponse(message, 400);
  }

  try {
    const product = await createProduct(parsed.data);
    return successResponse(product, 201);
  } catch (err: unknown) {
    // Prisma unique constraint violation (duplicate slug)
    if (isPrismaUniqueError(err)) {
      return errorResponse("A product with this slug already exists.", 409);
    }
    console.error("[POST /api/admin/products]", err);
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
