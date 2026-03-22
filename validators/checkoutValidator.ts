import { z } from "zod";

const checkoutItemSchema = z.object({
  productId: z.string().cuid("Invalid product ID."),
  quantity: z
    .number()
    .int("Quantity must be an integer.")
    .positive("Quantity must be positive.")
    .max(100, "Quantity per item cannot exceed 100."),
});

export const checkoutSchema = z
  .object({
    customerFirstName: z.string().min(1).max(100),
    customerLastName: z.string().min(1).max(100),
    email: z.string().email("Invalid email address."),
    phone: z
      .string()
      .min(7, "Phone number too short.")
      .max(20, "Phone number too long.")
      .regex(/^[+\d\s\-()]+$/, "Phone number contains invalid characters."),

    // Shipping address
    addressLine1: z.string().min(5, "Address is too short.").max(200),
    addressLine2: z.string().max(200).optional(),
    city: z.string().min(1).max(100),
    county: z.string().min(1).max(100),
    postalCode: z.string().max(20).optional(),
    notes: z.string().max(500).optional(),

    // Billing address
    billingSameAsShipping: z.boolean().default(true),
    billingAddressLine1: z.string().min(5, "Billing address is too short.").max(200).optional(),
    billingAddressLine2: z.string().max(200).optional(),
    billingCity: z.string().min(1).max(100).optional(),
    billingCounty: z.string().min(1).max(100).optional(),
    billingPostalCode: z.string().max(20).optional(),

    items: z
      .array(checkoutItemSchema)
      .min(1, "Order must contain at least one item.")
      .max(50, "Order cannot contain more than 50 distinct items."),
    paymentMethod: z.enum(["NETOPIA", "RAMBURS"], {
      errorMap: () => ({ message: "Unsupported payment method." }),
    }),
  })
  .refine(
    (data) => {
      if (!data.billingSameAsShipping) {
        return !!data.billingAddressLine1 && !!data.billingCity && !!data.billingCounty;
      }
      return true;
    },
    {
      message: "Adresa de facturare este obligatorie când diferă de adresa de livrare.",
      path: ["billingAddressLine1"],
    }
  );

export type CheckoutInput = z.infer<typeof checkoutSchema>;
