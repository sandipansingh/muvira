/**
 * Paisa/Rupee conversion utilities.
 * All monetary amounts in the backend database are stored as integer paisa (₹1 = 100 paisa).
 */

/**
 * Converts float/integer Rupees to integer Paisa (e.g. 150.50 -> 15050).
 */
export const rupeesToPaisa = (rupees: number | string): number => {
  const val = typeof rupees === 'string' ? parseFloat(rupees) : rupees
  if (isNaN(val)) return 0
  return Math.round(val * 100)
}

/**
 * Converts integer Paisa to float Rupees (e.g. 15050 -> 150.50).
 */
export const paisaToRupees = (paisa: number): number => {
  if (!paisa || isNaN(paisa)) return 0
  return paisa / 100
}
