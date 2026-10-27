import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { buildMetadata, renderHead, resolvePage } from '../../lib/seo/metadata.mjs'
import type { PageMetadata, SeoConfig } from '../../lib/seo/metadata.mjs'
import { readSeoCatalog } from '../../lib/services/seo.service'

function publicConfig(): SeoConfig {
  const node = document.getElementById('seo-config')
  if (node?.textContent) return JSON.parse(node.textContent) as SeoConfig
  return {
    siteUrl: import.meta.env.VITE_SITE_URL || 'https://muvira.in',
    indexingEnabled: import.meta.env.VITE_SEO_INDEXING_ENABLED === 'true',
  }
}

function applyHead(metadata: PageMetadata) {
  document.head
    .querySelectorAll(
      '[data-seo], title, meta[name="description"], meta[name="keywords"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]'
    )
    .forEach((node) => node.remove())
  const fragment = document.createElement('template')
  fragment.innerHTML = renderHead(metadata)
  document.head.append(fragment.content)
}

export function RouteSeo() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const initialRouteExited = useRef(false)
  useLayoutEffect(() => {
    const route = pathname + search
    const config = publicConfig()
    const initial = document.getElementById('seo-initial')
    const state = initial?.textContent
      ? (JSON.parse(initial.textContent) as { route: string; metadata: PageMetadata })
      : undefined
    if (state?.route !== route) initialRouteExited.current = true
    const preserveInitial = !initialRouteExited.current && state?.route === route
    // Keep the valid host head while its first catalog refresh is pending.
    if (!preserveInitial) applyHead(buildMetadata(route, { status: 503 }, config))
    let active = true
    void resolvePage(route, readSeoCatalog, config).then((result) => {
      if (active && result.redirect) {
        void navigate(result.redirect, { replace: true })
        return
      }
      if (active && result.metadata) applyHead(result.metadata)
    })
    return () => {
      active = false
    }
  }, [pathname, search, navigate])
  return null
}
