/**
 * Tax calculation — currently returns 0 for all orders.
 *
 * This is an intentional stub. When GST rates are confirmed:
 *  1. Add the rate logic inside calculateTax()
 *  2. No other file needs to change — checkout, orders, and admin
 *     all call this single function.
 *
 * All amounts are integer paisa. Never introduce floating-point arithmetic.
 */

/**
 * Calculates tax on the given subtotal (after discounts) in paisa.
 * @param subtotalPaisa - amount after applying discounts
 * @returns tax amount in paisa (integer)
 */
export function calculateTax(subtotalPaisa: number): number {
  // TODO: Replace 0 with actual GST rate calculation when rates are confirmed.
  // Example (18% GST): return Math.round(subtotalPaisa * 0.18);
  return 0;
}
