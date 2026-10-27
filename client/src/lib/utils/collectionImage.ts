const reviewedSources: Record<string, string> = {
  'https://mmpsquheiibatsjficwm.supabase.co/storage/v1/object/public/images/categories/1785931135221-7e7p23vd-whatsapp-image-2026-07-08-at-4.53.04-pm-2-.jpeg':
    'god-idols',
  'https://mmpsquheiibatsjficwm.supabase.co/storage/v1/object/public/images/categories/1785931251388-4khh7p8m-whatsapp-image-2026-07-19-at-4.19.58-pm-2-.jpeg':
    'home-decor',
  'https://mmpsquheiibatsjficwm.supabase.co/storage/v1/object/public/images/categories/1785931031345-n4slew4s-whatsapp-image-2026-07-19-at-9.03.39-pm-1-.jpeg':
    'handmade-showpiece',
}

export function collectionImage(source: string) {
  const reviewed = reviewedSources[source]
  return reviewed
    ? {
        src: `/images/collections/${reviewed}-960.webp`,
        srcSet: [480, 960, 1536]
          .map((width) => `/images/collections/${reviewed}-${width}.webp ${width}w`)
          .join(', '),
      }
    : { src: source, srcSet: undefined }
}
