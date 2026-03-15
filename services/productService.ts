/**
 * services/productService.ts
 *
 * All database operations related to products.
 * Route handlers call these functions — never query Prisma directly in a handler.
 */

import { prisma } from "@/lib/prisma";
import type { CreateProductInput, UpdateProductInput } from "@/validators/productValidator";
import type { Product } from "@/types";

const productWithCategory = {
  include: { category: true },
} as const;

// ─────────────────────────────────────────────
// Public queries
// ─────────────────────────────────────────────

export async function getActiveProducts(categorySlug?: string) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      ...(categorySlug
        ? { category: { slug: categorySlug } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    ...productWithCategory,
  });
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

export async function getAllProductsAdmin() {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    ...productWithCategory,
  });
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
