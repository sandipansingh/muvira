import { useCallback, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Category } from '../../lib/types/category'
import { collectionHref } from '../../lib/utils/collectionPresentation'
import { CollectionImage } from './CollectionImage'

export function CollectionShortcuts({
  categories,
  activeSlug,
}: {
  categories: Category[]
  activeSlug: string
}) {
  const rowRef = useRef<HTMLElement>(null)
  const reveal = useCallback((active: HTMLElement) => {
    const row = rowRef.current
    if (!row) return
    const frame = row.getBoundingClientRect(),
      item = active.getBoundingClientRect()
    const inset = parseFloat(getComputedStyle(row).paddingLeft)
    if (item.left < frame.left + inset) row.scrollLeft += item.left - frame.left - inset
    else if (item.right > frame.right - inset) row.scrollLeft += item.right - frame.right + inset
  }, [])
  useLayoutEffect(() => {
    const row = rowRef.current
    const active = row?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!row || !active) return
    reveal(active)
  }, [activeSlug, categories, reveal])

  return (
    <nav
      ref={rowRef}
      className="layout-container catalog-siblings"
      aria-label="Browse sibling collections"
    >
      {categories.map((category) => (
        <Link
          key={category.id}
          to={collectionHref(category)}
          onFocus={(event) => reveal(event.currentTarget)}
          aria-current={category.slug === activeSlug ? 'page' : undefined}
        >
          <CollectionImage category={category} />
          <span>{category.name}</span>
        </Link>
      ))}
    </nav>
  )
}
