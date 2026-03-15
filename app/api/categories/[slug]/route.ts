/**
 * GET /api/categories/[slug]
 *
 * Returns a single category with its active products.
 * Used by the frontend to render a category page.
 *
 * Response:
 *   200 { success: true, data: { id, name, slug, description, products: [...] } }
 *   404 category not found
 */

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/utils/apiResponse";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          price: true,
          compareAtPrice: true,
          mainImage: true,
          stock: true,
        },
      },
    },
  });

  if (!category) {
    return errorResponse("Category not found.", 404);
  }

  return successResponse(category);
}
