import { adminSupabase } from "../../lib/supabase/admin";
import { razorpay } from "../../lib/razorpay/client";
import { logger } from "../../lib/logger";
import { calculateTax } from "../../lib/tax";
import { validateCoupon } from "../coupons/service";
import { AppError } from "../../types";
import type { Order, Coupon } from "../../types";
import { env } from "../../config/env";

/**
 * Calculates shipping amount in paisa.
 * Currently: free shipping on all orders.
 * Change this function when shipping rate tiers are introduced.
 */
function calculateShipping(_subtotalPaisa: number): number {
  // TODO: Implement tiered shipping when rates are confirmed
  return 0;
}

interface CreateOrderResult {
  order: Order;
  razorpay_order_id: string;
  amount_paisa: number;
  currency: string;
  key_id: string; // public key — safe to return; secret is NEVER returned
}

/**
 * Creates a Razorpay order and a pending DB order.
 *
 * SECURITY GUARANTEES:
 * - Cart is re-fetched from DB — client-supplied amounts are not used
 * - Coupon is re-validated server-side — preview result is not trusted
 * - Totals computed entirely server-side in integer paisa
 * - Razorpay KEY_SECRET is never returned or logged
 * - Returns only razorpay_order_id, amount, currency, key_id (public)
 */
export async function createCheckoutOrder(
  userId: string,
  input: { address_id: string; coupon_code?: string },
): Promise<CreateOrderResult> {
  // 1. Fetch and validate cart
  const { data: cartItems, error: cartError } = await adminSupabase
    .from("cart_items")
    .select(
      `
      id, product_id, quantity,
      products ( id, name, slug, price_paisa, stock, is_active, sku,
        product_images ( url, is_primary ) )
    `,
    )
    .eq("user_id", userId);

  if (cartError) throw new AppError(500, "DB_ERROR", "Failed to fetch cart");
  if (!cartItems || cartItems.length === 0) {
    throw new AppError(400, "CART_EMPTY", "Your cart is empty");
  }

  // Validate stock for every item
  const stockErrors: string[] = [];
  for (const item of cartItems) {
    const product = (
      item as unknown as {
        products: {
          id: string;
          name: string;
          price_paisa: number;
          stock: number;
          is_active: boolean;
          sku: string | null;
        };
      }
    ).products;
    if (!product || !product.is_active) {
      stockErrors.push(`Product is no longer available`);
    } else if (
      product.stock < (item as unknown as { quantity: number }).quantity
    ) {
      stockErrors.push(
        `"${product.name}" has only ${product.stock} units available`,
      );
    }
  }

  if (stockErrors.length > 0) {
    throw new AppError(400, "STOCK_UNAVAILABLE", stockErrors.join("; "));
  }

  // 2. Compute subtotal server-side
  // CRITICAL: amount is computed from DB prices — never from client input
  let subtotalPaisa = 0;
  for (const item of cartItems) {
    const product = (item as unknown as { products: { price_paisa: number } })
      .products;
    subtotalPaisa +=
      product.price_paisa * (item as unknown as { quantity: number }).quantity;
  }

  // 3. Re-validate coupon server-side
  // CRITICAL: coupon is validated here independently, even if client already
  // called /checkout/apply-coupon. The preview result is not trusted.
  let couponData: Coupon | null = null;
  let discountAmountPaisa = 0;

  if (input.coupon_code) {
    try {
      const result = await validateCoupon(input.coupon_code, subtotalPaisa);
      couponData = result.coupon;
      discountAmountPaisa = result.discountPaisa;
    } catch {
      // Re-throw with a checkout-specific wrapper so the client knows the coupon failed
      throw new AppError(
        400,
        "COUPON_INVALID",
        "The coupon code is no longer valid",
      );
    }
  }

  // 4. Compute final totals
  const discountedSubtotal = subtotalPaisa - discountAmountPaisa;
  const shippingAmountPaisa = calculateShipping(discountedSubtotal);
  const taxAmountPaisa = calculateTax(discountedSubtotal);
  const totalAmountPaisa =
    discountedSubtotal + shippingAmountPaisa + taxAmountPaisa;

  if (totalAmountPaisa < 100) {
    // Razorpay minimum is ₹1 (100 paisa)
    throw new AppError(
      400,
      "ORDER_AMOUNT_TOO_LOW",
      "Order total must be at least ₹1",
    );
  }

  // 5. Fetch and snapshot shipping address
  const { data: address } = await adminSupabase
    .from("addresses")
    .select("*")
    .eq("id", input.address_id)
    .eq("user_id", userId) // Layer 2: ownership check
    .single();

  if (!address) {
    throw new AppError(404, "ADDRESS_NOT_FOUND", "Shipping address not found");
  }

  // 6. Generate order number
  const { data: orderNumResult, error: orderNumError } =
    await adminSupabase.rpc("generate_order_number", {
      prefix: env.ORDER_PREFIX,
    });

  if (orderNumError || !orderNumResult) {
    throw new AppError(500, "DB_ERROR", "Failed to generate order number");
  }
  const orderNumber: string = orderNumResult as string;

  // 7. Create Razorpay order
  // SECURITY: This uses the server-side Razorpay SDK with KEY_SECRET.
  // The KEY_SECRET is NEVER returned or logged.
  // Razorpay SDK returns amount as string | number depending on the version;
  // we only use `id` and `currency` for the response — `amount` comes from our server-computed totalAmountPaisa.
  let razorpayOrder: { id: string; amount: string | number; currency: string };
  try {
    razorpayOrder = await razorpay.orders.create({
      amount: totalAmountPaisa,
      currency: "INR",
      receipt: orderNumber,
    });
  } catch (err) {
    logger.error({ err }, "Razorpay order creation failed");
    throw new AppError(
      502,
      "PAYMENT_GATEWAY_ERROR",
      "Failed to create payment order. Please try again.",
    );
  }

  // 8. Insert DB order row with status='pending'
  const orderInsert = {
    order_number: orderNumber,
    user_id: userId,
    status: "pending" as const,
    payment_status: "pending" as const,
    fulfillment_status: "unfulfilled" as const,
    // Immutable address snapshot
    shipping_full_name: address.full_name,
    shipping_phone: address.phone,
    shipping_address_line1: address.address_line1,
    shipping_address_line2: address.address_line2 ?? null,
    shipping_city: address.city,
    shipping_state: address.state,
    shipping_pincode: address.pincode,
    shipping_country: address.country,
    // Amounts (server-computed — NEVER from client)
    subtotal_paisa: subtotalPaisa,
    discount_amount_paisa: discountAmountPaisa,
    shipping_amount_paisa: shippingAmountPaisa,
    tax_amount_paisa: taxAmountPaisa,
    total_amount_paisa: totalAmountPaisa,
    // Coupon snapshot
    coupon_id: couponData?.id ?? null,
    coupon_code: couponData?.code ?? null,
    coupon_discount_paisa: discountAmountPaisa,
  };

  const { data: order, error: orderError } = await adminSupabase
    .from("orders")
    .insert(orderInsert)
    .select()
    .single();

  if (orderError || !order) {
    logger.error({ error: orderError }, "Failed to insert order");
    throw new AppError(500, "DB_ERROR", "Failed to create order");
  }

  // 9. Insert order items (product snapshot)
  const orderItems = cartItems.map((item) => {
    const typedItem = item as unknown as {
      product_id: string;
      quantity: number;
      products: {
        name: string;
        sku: string | null;
        price_paisa: number;
        product_images: Array<{ url: string; is_primary: boolean }>;
      };
    };
    const primaryImage = typedItem.products.product_images?.find(
      (img) => img.is_primary,
    );
    return {
      order_id: order.id,
      product_id: typedItem.product_id,
      product_name: typedItem.products.name,
      product_sku: typedItem.products.sku ?? null,
      product_image_url:
        primaryImage?.url ??
        typedItem.products.product_images?.[0]?.url ??
        null,
      quantity: typedItem.quantity,
      unit_price_paisa: typedItem.products.price_paisa,
      total_price_paisa: typedItem.products.price_paisa * typedItem.quantity,
    };
  });

  const { error: itemsError } = await adminSupabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    logger.error(
      { error: itemsError, orderId: order.id },
      "Failed to insert order items",
    );
    // Best-effort: delete the orphaned order before throwing
    await adminSupabase.from("orders").delete().eq("id", order.id);
    throw new AppError(500, "DB_ERROR", "Failed to create order items");
  }

  // 10. Insert payment row with status='created'
  const { error: paymentError } = await adminSupabase.from("payments").insert({
    order_id: order.id,
    razorpay_order_id: razorpayOrder.id,
    amount_paisa: totalAmountPaisa,
    currency: "INR",
    status: "created",
  });

  if (paymentError) {
    logger.error(
      { error: paymentError, orderId: order.id },
      "Failed to insert payment row",
    );
    throw new AppError(500, "DB_ERROR", "Failed to initialize payment record");
  }

  // 11. Log the 'created' event
  await adminSupabase.from("payment_logs").insert({
    order_id: order.id,
    event_type: "created",
    payload: {
      razorpay_order_id: razorpayOrder.id,
      amount_paisa: totalAmountPaisa,
    },
  });

  logger.info(
    {
      orderId: order.id,
      orderNumber,
      razorpayOrderId: razorpayOrder.id,
      totalAmountPaisa,
    },
    "Checkout order created",
  );

  // 12. Return only what the client needs to open Razorpay Checkout
  // CRITICAL: KEY_SECRET is NEVER included here
  return {
    order: order as Order,
    razorpay_order_id: razorpayOrder.id,
    amount_paisa: totalAmountPaisa,
    currency: "INR",
    key_id: env.RAZORPAY_KEY_ID, // public key — safe to return
  };
}
