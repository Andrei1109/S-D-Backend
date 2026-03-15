/**
 * prisma/seed.ts
 *
 * Run with:  npm run db:seed
 *            (or: npx tsx prisma/seed.ts)
 *
 * Seeds one admin user, two categories, and two sample products.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Admin ──────────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@sdbeautyhub.ro";
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD ?? "Admin1234!";

  const existing = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.admin.create({
      data: { email: adminEmail, passwordHash, name: "Store Admin" },
    });
    console.log(`✅  Admin created: ${adminEmail}`);
  } else {
    console.log(`ℹ️   Admin already exists: ${adminEmail}`);
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "ingrijire-par" },
      update: { name: "Îngrijire Păr" },
      create: {
        name: "Îngrijire Păr",
        slug: "ingrijire-par",
        description: "Șampoane, balsamuri, măști și tratamente pentru păr.",
      },
    }),
    prisma.category.upsert({
      where: { slug: "ingrijire-fata" },
      update: { name: "Îngrijire Față" },
      create: {
        name: "Îngrijire Față",
        slug: "ingrijire-fata",
        description: "Creme, serumuri și tratamente pentru față.",
      },
    }),
    prisma.category.upsert({
      where: { slug: "ingrijire-corp" },
      update: { name: "Îngrijire Corp" },
      create: {
        name: "Îngrijire Corp",
        slug: "ingrijire-corp",
        description: "Loțiuni, uleiuri și exfoliante pentru corp.",
      },
    }),
    prisma.category.upsert({
      where: { slug: "make-up" },
      update: { name: "Make-Up" },
      create: {
        name: "Make-Up",
        slug: "make-up",
        description: "Fond de ten, rujuri, rimel, farduri și produse de machiaj.",
      },
    }),
    prisma.category.upsert({
      where: { slug: "parfumuri" },
      update: { name: "Parfumuri" },
      create: {
        name: "Parfumuri",
        slug: "parfumuri",
        description: "Ape de parfum, ape de toaletă și body mist.",
      },
    }),
    prisma.category.upsert({
      where: { slug: "accesorii" },
      update: { name: "Accesorii" },
      create: {
        name: "Accesorii",
        slug: "accesorii",
        description: "Pensule, burete, benzi, oglinzi și accesorii de beauty.",
      },
    }),
    prisma.category.upsert({
      where: { slug: "consumabile" },
      update: { name: "Consumabile" },
      create: {
        name: "Consumabile",
        slug: "consumabile",
        description: "Dischete demachiante, bețișoare, mănuși și alte consumabile.",
      },
    }),
  ]);
  console.log(`✅  Categories seeded: ${categories.map((c) => c.slug).join(", ")}`);

  // ── Products ───────────────────────────────────────────────────────────────
  const faceCategoryId = categories[1].id;  // ingrijire-fata
  const bodyCategoryId = categories[2].id;  // ingrijire-corp

  await prisma.product.upsert({
    where: { slug: "crema-hidratanta-fata-spf15" },
    update: {},
    create: {
      name: "Cremă hidratantă față SPF 15",
      slug: "crema-hidratanta-fata-spf15",
      shortDescription: "Cremă ușoară cu protecție solară pentru ten normal și mixt.",
      fullDescription:
        "Formulă non-comedogenică cu acid hialuronic și vitamina E. " +
        "Hidratează pielea timp de 24 de ore, protejând-o împotriva razelor UV. " +
        "Textura ușoară se absoarbe rapid fără să lase un film gras.",
      price: 89.9,
      compareAtPrice: 109.9,
      mainImage: "https://placehold.co/800x800?text=Crema+Hidratanta",
      galleryImages: [],
      categoryId: faceCategoryId,
      stock: 50,
      isActive: true,
      ingredients:
        "Aqua, Glycerin, Caprylic/Capric Triglyceride, Sodium Hyaluronate, Tocopheryl Acetate",
      usageInstructions: "Aplică dimineața pe pielea curată înainte de machiaj.",
      benefits: "Hidratare 24h, protecție SPF 15, textură ușoară",
    },
  });

  await prisma.product.upsert({
    where: { slug: "ulei-corp-argan-si-lavanda" },
    update: {},
    create: {
      name: "Ulei de corp argan & lavandă",
      slug: "ulei-corp-argan-si-lavanda",
      shortDescription: "Ulei nutritiv cu argan presat la rece și ulei esențial de lavandă.",
      fullDescription:
        "Ulei 100% natural, fără parabeni sau conservanți sintetici. " +
        "Hrănește și catifelează pielea uscată, lăsând un parfum delicat de lavandă. " +
        "Ideal după duș, aplicat pe pielea ușor umedă.",
      price: 65.0,
      mainImage: "https://placehold.co/800x800?text=Ulei+Corp+Argan",
      galleryImages: [],
      categoryId: bodyCategoryId,
      stock: 30,
      isActive: true,
      ingredients: "Argania Spinosa Kernel Oil, Lavandula Angustifolia Oil",
      usageInstructions: "Aplică o cantitate mică pe piele după duș și masează ușor.",
      benefits: "Nutriție intensă, piele catifelată, parfum natural",
    },
  });

  console.log(`✅  Products seeded.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
