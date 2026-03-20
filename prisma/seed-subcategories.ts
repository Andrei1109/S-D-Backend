/**
 * Seed script to create categories and subcategories.
 * Run with: npx tsx prisma/seed-subcategories.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toSlug(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORIES_WITH_SUBCATEGORIES: Record<string, string[]> = {
  "Accesorii": ["Portofele", "Genți", "Ghiozdane"],
  "Parfumuri": ["Avon", "Tulipan"],
  "Make-up": ["Ochi", "Buze", "Față", "Sprâncene"],
  "Îngrijire corp": [
    "Gel de duș", "Spumant baie", "Loțiune", "Uleiuri",
    "Creme mâini-corp", "Unturi", "Cremă depilatoare",
  ],
  "Îngrijire față": ["Creme", "Ser", "Accesorii", "Măști", "Apă micelară"],
  "Îngrijire păr": ["Șampon", "Balsam", "Ser", "Ulei", "Mască"],
};

async function main() {
  console.log("🌱 Seeding categories and subcategories...\n");

  for (const [categoryName, subcategoryNames] of Object.entries(CATEGORIES_WITH_SUBCATEGORIES)) {
    const categorySlug = toSlug(categoryName);

    // Upsert category
    const category = await prisma.category.upsert({
      where: { slug: categorySlug },
      update: { name: categoryName },
      create: { name: categoryName, slug: categorySlug },
    });

    console.log(`📁 ${category.name} (${category.slug})`);

    for (const subName of subcategoryNames) {
      const subSlug = toSlug(`${categoryName}-${subName}`);

      await prisma.subcategory.upsert({
        where: { slug: subSlug },
        update: { name: subName, categoryId: category.id },
        create: {
          name: subName,
          slug: subSlug,
          categoryId: category.id,
        },
      });

      console.log(`   └── ${subName} (${subSlug})`);
    }
  }

  console.log("\n✅ Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
