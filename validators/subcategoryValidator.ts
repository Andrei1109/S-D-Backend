import { z } from "zod";

const subcategoryBaseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase with hyphens only."
    ),
  categoryId: z.string().cuid("Invalid category ID."),
});

// All fields required on create
export const createSubcategorySchema = subcategoryBaseSchema;

// Only name and slug are updatable (partial)
export const updateSubcategorySchema = subcategoryBaseSchema
  .pick({ name: true, slug: true })
  .partial();

export type CreateSubcategoryInput = z.infer<typeof createSubcategorySchema>;
export type UpdateSubcategoryInput = z.infer<typeof updateSubcategorySchema>;
