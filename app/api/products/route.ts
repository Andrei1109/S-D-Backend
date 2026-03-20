/**
 * GET /api/products?category=<slug>
 * Returns all active products. Optionally filter by category slug.
 */

import { type NextRequest } from "next/server";
import { getActiveProducts } from "@/services/productService";
import { paginatedResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 20));
    const search = sp.get("search") ?? undefined;
    const categorySlug = sp.get("category") ?? undefined;
    const subcategorySlug = sp.get("subcategory") ?? undefined;

    const result = await getActiveProducts({ page, limit, search, categorySlug, subcategorySlug });
    return paginatedResponse(result.data, result.pagination);
  } catch (err) {
    console.error("[GET /api/products]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
