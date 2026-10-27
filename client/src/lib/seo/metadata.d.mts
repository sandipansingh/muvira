export interface SeoConfig {
  siteUrl: string
  indexingEnabled: boolean
}
export interface PageMetadata {
  title: string
  description: string
  keywords: string
  canonical: string
  robots: string
  image: string
  imageWidth?: number
  imageHeight?: number
  type: string
  schemas: Record<string, unknown>[]
}
export interface SeoEnvelope {
  success: boolean
  data: unknown
  meta?: { total: number; totalPages: number }
}
export function buildMetadata(
  route: string,
  data?: Record<string, unknown>,
  config?: SeoConfig
): PageMetadata
export function renderHead(metadata: PageMetadata): string
export function resolvePage(
  route: string,
  read: (path: string) => Promise<SeoEnvelope>,
  config: SeoConfig
): Promise<{ status: number; redirect?: string; metadata?: PageMetadata }>
export function categoryDestination(slug: string, search?: string): string
export function safeJson(value: unknown): string
export function escapeHtml(value: unknown): string
