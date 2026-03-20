/**
 * services/subcategoryService.ts
 *
 * All database operations related to subcategories.
 */

import { prisma } from "@/lib/prisma";

export async function getSubcategoriesByCategoryId(categoryId: string) {
  return prisma.subcategory.findMany({
    where: { categoryId },
    orderBy: { name: "asc" },
  });
}

export async function getAllSubcategories() {
  return prisma.subcategory.findMany({
    orderBy: { name: "asc" },
    include: { category: true },
  });
}

export async function getSubcategoryById(id: string) {
  return prisma.subcategory.findUnique({ where: { id } });
}

export async function createSubcategory(data: {
  name: string;
  slug: string;
  categoryId: string;
}) {
  return prisma.subcategory.create({ data });
}

export async function updateSubcategory(
  id: string,
  data: { name?: string; slug?: string }
) {
  const exists = await prisma.subcategory.findUnique({ where: { id } });
  if (!exists) return null;
  return prisma.subcategory.update({ where: { id }, data });
}

export async function deleteSubcategory(id: string) {
  const subcategory = await prisma.subcategory.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!subcategory) return null;

  const productCount = (
    subcategory as typeof subcategory & { _count: { products: number } }
  )._count.products;
  if (productCount > 0) {
    throw new Error(
      `Cannot delete a subcategory that has ${productCount} product(s) assigned to it.`
    );
  }

  return prisma.subcategory.delete({ where: { id } });
}
