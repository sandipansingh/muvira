export const STORE_NAME = import.meta.env.VITE_STORE_NAME || "Muvira";
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "";
export const DEFAULT_PAGE_LIMIT = 20;
export const TAX_RATE_PERCENT = 0;
export const SHIPPING_CHARGES = 0;

/** Base URL for all /api/* requests. Empty string means use Vite proxy in dev. */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "";
