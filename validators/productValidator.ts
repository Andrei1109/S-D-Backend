import { z } from "zod";

const productBaseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only."),
  shortDescription: z.string().min(10).max(500),
  fullDescription: z.string().min(10).max(10_000),
  price: z.number().positive("Price must be positive."),
  compareAtPrice: z.number().positive().optional().nullable(),
  mainImage: z.string().url("Main image must be a valid URL."),
  galleryImages: z.array(z.string().url()).max(10).optional().default([]),
  categoryId: z.string().cuid("Invalid category ID."),
  stock: z.number().int().min(0, "Stock cannot be negative."),
  isActive: z.boolean().optional().default(true),
  ingredients: z.string().max(2000).optional().nullable(),
  usageInstructions: z.string().max(2000).optional().nullable(),
  benefits: z.string().max(1000).optional().nullable(),
});

// All fields required on create
export const createProductSchema = productBaseSchema;

// All fields optional on update (partial)
export const updateProductSchema = productBaseSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
