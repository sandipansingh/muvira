import { z } from "zod";

export const ApplyCouponSchema = z
  .object({
    code: z.string().min(1).max(50).toUpperCase(),
  })
  .strict();

export const CouponIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// Base object schema — used for both Create (with refinement) and Update (partial)
// Split from .refine() so .partial() can be called before validation refinements are applied.
const CouponBaseObject = z
  .object({
    code: z
      .string()
      .min(3)
      .max(50)
      .regex(
        /^[A-Z0-9_-]+$/,
        "Code must be uppercase alphanumeric with hyphens/underscores",
      ),
    description: z.string().max(500).optional(),
    discount_type: z.enum(["percentage", "fixed"]),
    discount_value: z.number().int().positive(),
    min_order_amount_paisa: z.number().int().min(0).default(0),
    max_discount_paisa: z.number().int().positive().optional(),
    max_uses: z.number().int().positive().optional(),
    is_active: z.boolean().default(true),
    valid_from: z.string().datetime().optional(),
    valid_until: z.string().datetime().optional(),
  })
  .strict();

export const CreateCouponSchema = CouponBaseObject.refine(
  (data) => {
    if (data.discount_type === "percentage" && data.discount_value > 100)
      return false;
    return true;
  },
  {
    message: "Percentage discount cannot exceed 100",
    path: ["discount_value"],
  },
);

// UpdateCoupon: all fields optional. Refinement re-applied after partial().
export const UpdateCouponSchema = CouponBaseObject.partial()
  .strict()
  .refine(
    (data) => {
      if (
        data.discount_type === "percentage" &&
        data.discount_value !== undefined &&
        data.discount_value > 100
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Percentage discount cannot exceed 100",
      path: ["discount_value"],
    },
  );

export type ApplyCouponInput = z.infer<typeof ApplyCouponSchema>;
export type CreateCouponInput = z.infer<typeof CreateCouponSchema>;
export type UpdateCouponInput = z.infer<typeof UpdateCouponSchema>;
