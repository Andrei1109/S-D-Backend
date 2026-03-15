import { z } from "zod";

// Admin: manually update an order's status
export const updateOrderStatusSchema = z.object({
  orderStatus: z
    .enum(["new", "paid", "processing", "shipped", "delivered", "cancelled"], {
      errorMap: () => ({ message: "Invalid order status." }),
    })
    .optional(),

  // Payment status can only be set to cancelled manually (never to "paid" —
  // that must come from the authoritative payment callback).
  paymentStatus: z
    .enum(["cancelled"], {
      errorMap: () => ({
        message:
          "Payment status can only be set to 'cancelled' manually. " +
          "Paid status is set automatically by the payment provider callback.",
      }),
    })
    .optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
