/**
 * Formats a monetary value in paisa (integer) to Indian Rupees (₹) string.
 * e.g., 149900 -> ₹1,499 or ₹1,499.50
 */
export const formatPrice = (paisa: number): string => {
  const rupees = paisa / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    // If the amount is a whole number, omit the decimal places
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
};

/**
 * Formats an ISO date string into a localized readable date.
 * e.g., "2026-06-10T14:22:00Z" -> "10 Jun 2026, 7:52 PM"
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    return dateString;
  }
};
