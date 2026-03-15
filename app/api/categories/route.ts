/**
 * GET /api/categories
 * Returns all categories ordered by name.
 */

import { NextResponse } from "next/server";
import { getAllCategories } from "@/services/categoryService";
import { successResponse, errorResponse, ERRORS } from "@/utils/apiResponse";

export async function GET() {
  try {
    const categories = await getAllCategories();
    return successResponse(categories);
  } catch (err) {
    console.error("[GET /api/categories]", err);
    return errorResponse(ERRORS.INTERNAL, 500);
  }
}
