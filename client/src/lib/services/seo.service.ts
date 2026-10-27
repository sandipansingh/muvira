import { api } from '../api/client'
import type { SeoEnvelope } from '../seo/metadata.mjs'

export const readSeoCatalog = (path: string) => api.get<SeoEnvelope>(path)
