// Only use the reviewed composite while its exact source photograph is configured.
const reviewedImages: Record<string, string> = {
  'https://mmpsquheiibatsjficwm.supabase.co/storage/v1/object/public/images/hero-slides/1782923740579-8y8i3p63-whatsapp-image-2026-06-28-at-12.57.21-pm-2-.jpeg':
    '/images/editorial/ganesha-mandir.png',
}

export function editorialImage(source: string): string {
  return reviewedImages[source] || source
}
