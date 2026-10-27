// Only use the reviewed composite while its exact source photograph is configured.
const reviewedImages: Record<string, string> = {
  'https://mmpsquheiibatsjficwm.supabase.co/storage/v1/object/public/images/hero-slides/1782923740579-8y8i3p63-whatsapp-image-2026-06-28-at-12.57.21-pm-2-.jpeg':
    'ganesha',
  'https://mmpsquheiibatsjficwm.supabase.co/storage/v1/object/public/images/hero-slides/1782923788616-d97yqtt3-whatsapp-image-2026-06-28-at-12.57.14-pm.jpeg':
    'jagannath',
  'https://mmpsquheiibatsjficwm.supabase.co/storage/v1/object/public/images/hero-slides/1782923865502-mm4c3tr0-whatsapp-image-2026-06-28-at-12.57.27-pm.jpeg':
    'balaji',
}

export function editorialImage(
  source: string,
  composition: 'desktop' | 'mobile' = 'desktop'
): string {
  const reviewed = reviewedImages[source]
  return reviewed ? `/images/editorial/${reviewed}-${composition}.webp` : source
}

export function heroDestination(link: string | undefined, categorySlugs: string[]): string {
  if (!link) return '/shop'
  const category = link.match(/^\/categor(?:y|ies)\/([^/?#]+)/)
  if (category) {
    const slug = category[1]
    return categorySlugs.includes(slug) ? `/shop?category=${encodeURIComponent(slug)}` : '/shop'
  }
  return link
}
