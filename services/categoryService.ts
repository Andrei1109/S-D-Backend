/**
 * services/categoryService.ts
 *
 * All database operations related to categories.
 */

import { prisma } from "@/lib/prisma";
import type { Category } from "@/types";

export async function getAllCategories(): Promise<Category[]> {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return prisma.category.findUnique({ where: { slug } });
}

export async function getCategoryById(id: string): Promise<Category | null> {
  return prisma.category.findUnique({ where: { id } });
}

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
}): Promise<Category> {
  return prisma.category.create({ data });
}

export async function updateCategory(
  id: string,
  data: { name?: string; slug?: string; description?: string }
): Promise<Category | null> {
  const exists = await prisma.category.findUnique({ where: { id } });
  if (!exists) return null;
  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id: string): Promise<Category | null> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) return null;

  const productCount = (category as typeof category & { _count: { products: number } })._count.products;
  if (productCount > 0) {
    throw new Error(`Cannot delete a category that has ${productCount} product(s) assigned to it.`);
  }

  return prisma.category.delete({ where: { id } });
}
