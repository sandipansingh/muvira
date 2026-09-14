/**
 * Core application constants and API configuration.
 */
export const STORE_NAME = import.meta.env.VITE_STORE_NAME || 'Muvira'
export const DEFAULT_PAGE_LIMIT = 20
export const TAX_RATE_PERCENT = 0

// Use VITE_API_URL for production API origin (e.g., https://api.muvira.in).
// Leave empty in development to use Vite's /api proxy.
const rawBase = import.meta.env.VITE_API_URL ?? ''
export const API_BASE_URL: string = rawBase.replace(/\/+$/, '')
