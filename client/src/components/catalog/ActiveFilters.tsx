import { X } from 'lucide-react'
import { formatPrice } from '../../lib/utils/format'

interface ActiveFiltersProps {
  params: URLSearchParams
  categories: { slug: string; name: string }[]
  onChange: (changes: Record<string, string | undefined>) => void
  onClear: () => void
  includeQuery?: boolean
}

export function ActiveFilters({
  params,
  categories,
  onChange,
  onClear,
  includeQuery = true,
}: ActiveFiltersProps) {
  const chips: { label: string; keys: string[] }[] = []
  const category = params.get('category')
  if (includeQuery && params.get('q')) chips.push({ label: `“${params.get('q')}”`, keys: ['q'] })
  if (category && category !== 'all')
    chips.push({
      label: categories.find((item) => item.slug === category)?.name || category,
      keys: ['category'],
    })
  const min = params.get('minPrice'),
    max = params.get('maxPrice')
  if (min || max)
    chips.push({
      label:
        min && max
          ? `${formatPrice(Number(min) * 100)} – ${formatPrice(Number(max) * 100)}`
          : min
            ? `From ${formatPrice(Number(min) * 100)}`
            : `Up to ${formatPrice(Number(max) * 100)}`,
      keys: ['minPrice', 'maxPrice', 'priceRange'],
    })
  if (params.get('inStock') === 'true') chips.push({ label: 'In stock', keys: ['inStock'] })
  if (!chips.length) return null
  return (
    <div className="active-filters" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.keys[0]}
          type="button"
          className="filter-chip"
          aria-label={`Remove ${chip.label} filter`}
          onClick={() =>
            onChange(Object.fromEntries([...chip.keys, 'page'].map((key) => [key, undefined])))
          }
        >
          {chip.label}
          <X className="h-3.5 w-3.5 shrink-0" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="min-h-11 px-2 text-sm text-muted underline underline-offset-4 hover:text-primary"
      >
        Clear filters
      </button>
    </div>
  )
}
