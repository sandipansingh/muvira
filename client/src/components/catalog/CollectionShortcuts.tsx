import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import type { Category } from '../../lib/types/category'
import { collectionHref } from '../../lib/utils/collectionPresentation'
import { CollectionImage } from './CollectionImage'
import { Button } from '../ui/Button'

export function CollectionShortcuts({
  categories,
  activeSlug,
}: {
  categories: Category[]
  activeSlug: string
}) {
  const rowRef = useRef<HTMLElement>(null)
  const rowId = useId()
  const reducedMotion = useReducedMotion()
  const [scroll, setScroll] = useState({ overflow: false, start: true, end: false })
  const measure = useCallback(() => {
    const row = rowRef.current
    if (!row) return
    const next = {
      overflow: row.scrollWidth > row.clientWidth + 1,
      start: row.scrollLeft <= 1,
      end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 1,
    }
    setScroll((previous) =>
      previous.overflow === next.overflow &&
      previous.start === next.start &&
      previous.end === next.end
        ? previous
        : next
    )
  }, [])
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
  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return
    const observer = new ResizeObserver(() => {
      const focused = document.activeElement
      const active = row.querySelector<HTMLElement>('[aria-current="page"]')
      if (focused instanceof HTMLElement && row.contains(focused)) reveal(focused)
      else if (active) reveal(active)
      measure()
    })
    observer.observe(row)
    for (const child of row.children) observer.observe(child)
    measure()
    return () => observer.disconnect()
  }, [categories, measure, reveal])

  const scrollBy = (direction: number) => {
    const row = rowRef.current
    if (!row) return
    row.scrollBy({
      left: direction * row.clientWidth * 0.8,
      behavior: reducedMotion ? 'instant' : 'smooth',
    })
  }

  return (
    <div className="layout-container catalog-collections">
      <nav
        id={rowId}
        ref={rowRef}
        onScroll={measure}
        className="catalog-siblings"
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
      {scroll.overflow && (
        <div className="catalog-collection-controls">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollBy(-1)}
            disabled={scroll.start}
            aria-controls={rowId}
            aria-label="Previous collections"
            leftIcon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollBy(1)}
            disabled={scroll.end}
            aria-controls={rowId}
            aria-label="Next collections"
            rightIcon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
