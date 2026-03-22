/**
 * services/productService.ts
 *
 * All database operations related to products.
 * Route handlers call these functions — never query Prisma directly in a handler.
 */

import { prisma } from "@/lib/prisma";
import type { CreateProductInput, UpdateProductInput } from "@/validators/productValidator";
import type { Product } from "@/types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  categorySlug?: string;
  subcategorySlug?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const productWithCategory = {
  include: { category: true, subcategory: true },
} as const;

// ─────────────────────────────────────────────
// Public queries
// ─────────────────────────────────────────────

export async function getActiveProducts(
  params: ProductListParams = {}
): Promise<PaginatedResult<Product>> {
  const { page = 1, limit = 20, search, categorySlug, subcategorySlug } = params;
  const skip = (page - 1) * limit;

  const searchWords = search?.trim().split(/\s+/).filter(Boolean) ?? [];
  const searchCondition = searchWords.length > 0 ? {
    AND: searchWords.map(word => ({
      OR: [
        { name: { contains: word, mode: 'insensitive' as const } },
        { shortDescription: { contains: word, mode: 'insensitive' as const } },
        { fullDescription: { contains: word, mode: 'insensitive' as const } },
      ],
    })),
  } : {};

  // Detect if value is an ID (CUID or UUID) vs. a slug
  const isId = (v: string) => /^c[a-z0-9]{24}$/.test(v) || /^[0-9a-f-]{36}$/i.test(v);

  const where = {
    isActive: true,
    ...(categorySlug
      ? isId(categorySlug)
        ? { categoryId: categorySlug }
        : { category: { slug: categorySlug } }
      : {}),
    ...(subcategorySlug
      ? isId(subcategorySlug)
        ? { subcategoryId: subcategorySlug }
        : { subcategory: { slug: subcategorySlug } }
      : {}),
    ...searchCondition,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      ...productWithCategory,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    ...productWithCategory,
  });
}

// ─────────────────────────────────────────────
// Admin queries
// ─────────────────────────────────────────────

export async function getAllProductsAdmin(
  params: ProductListParams = {}
): Promise<PaginatedResult<Product>> {
  const { page = 1, limit = 20, search, categorySlug, subcategorySlug } = params;
  const skip = (page - 1) * limit;

  const searchWords = search?.trim().split(/\s+/).filter(Boolean) ?? [];
  const searchCondition = searchWords.length > 0 ? {
    AND: searchWords.map(word => ({
      OR: [
        { name: { contains: word, mode: 'insensitive' as const } },
        { shortDescription: { contains: word, mode: 'insensitive' as const } },
        { fullDescription: { contains: word, mode: 'insensitive' as const } },
      ],
    })),
  } : {};

  // Detect if value is an ID (CUID or UUID) vs. a slug
  const isId = (v: string) => /^c[a-z0-9]{24}$/.test(v) || /^[0-9a-f-]{36}$/i.test(v);

  const where = {
    ...(categorySlug
      ? isId(categorySlug)
        ? { categoryId: categorySlug }
        : { category: { slug: categorySlug } }
      : {}),
    ...(subcategorySlug
      ? isId(subcategorySlug)
        ? { subcategoryId: subcategorySlug }
        : { subcategory: { slug: subcategorySlug } }
      : {}),
    ...searchCondition,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      ...productWithCategory,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProductByIdAdmin(id: string) {
  return prisma.product.findUnique({
    where: { id },
    ...productWithCategory,
  });
}

export async function createProduct(data: CreateProductInput): Promise<Product> {
  return prisma.product.create({
    data: {
      name: data.name,
      slug: data.slug,
      shortDescription: data.shortDescription,
      fullDescription: data.fullDescription,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      mainImage: data.mainImage,
      galleryImages: data.galleryImages ?? [],
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId ?? null,
      stock: data.stock,
      isActive: data.isActive ?? true,
      ingredients: data.ingredients ?? null,
      usageInstructions: data.usageInstructions ?? null,
      benefits: data.benefits ?? null,
    },
  });
}

export async function updateProduct(
  id: string,
  data: UpdateProductInput
): Promise<Product | null> {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return null;

  return prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.shortDescription !== undefined && { shortDescription: data.shortDescription }),
      ...(data.fullDescription !== undefined && { fullDescription: data.fullDescription }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.compareAtPrice !== undefined && { compareAtPrice: data.compareAtPrice }),
      ...(data.mainImage !== undefined && { mainImage: data.mainImage }),
      ...(data.galleryImages !== undefined && { galleryImages: data.galleryImages }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.subcategoryId !== undefined && { subcategoryId: data.subcategoryId }),
      ...(data.stock !== undefined && { stock: data.stock }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.ingredients !== undefined && { ingredients: data.ingredients }),
      ...(data.usageInstructions !== undefined && { usageInstructions: data.usageInstructions }),
      ...(data.benefits !== undefined && { benefits: data.benefits }),
    },
  });
}

/**
 * Soft-delete is preferred, but for this MVP we hard-delete.
 * Because OrderItems snapshot the product name and price, historical orders
 * remain intact even after the product row is deleted.
 */
export async function deleteProduct(id: string): Promise<boolean> {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return false;

  await prisma.product.delete({ where: { id } });
  return true;
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/**
 * Fetch multiple products by IDs in a single query.
 * Used by the checkout service to validate and price-check the cart.
 */
export async function getProductsByIds(ids: string[]) {
  return prisma.product.findMany({
    where: { id: { in: ids } },
  });
}
