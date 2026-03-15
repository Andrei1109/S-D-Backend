/**
 * GET /api/products/:slug
 * Returns a single active product by its slug.
 */

import { type NextRequest } from "next/server";
import { getProductBySlug } from "@/services/productService";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const product = await getProductBySlug(slug);

    if (!product) {
      return errorResponse(ERRORS.NOT_FOUND("Product"), 404);
    }

    return successResponse(product);
  } catch (err) {
    console.error("[GET /api/products/[slug]]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
