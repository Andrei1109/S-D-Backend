/**
 * GET /api/products?category=<slug>
 * Returns all active products. Optionally filter by category slug.
 */

import { type NextRequest } from "next/server";
import { getActiveProducts } from "@/services/productService";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

export async function GET(request: NextRequest) {
  try {
    const categorySlug = request.nextUrl.searchParams.get("category") ?? undefined;
    const products = await getActiveProducts(categorySlug);
    return successResponse(products);
  } catch (err) {
    console.error("[GET /api/products]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
