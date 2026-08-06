/**
 * Price and Date formatting utilities.
 */

/**
 * Formats integer paisa into INR currency format (e.g. 15000 -> "₹150", 15050 -> "₹150.50").
 */
export const formatPrice = (paisa: number): string => {
  const rupees = paisa / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees)
}

/**
 * Formats ISO date string into Indian standard date string.
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return dateString
  }
}
