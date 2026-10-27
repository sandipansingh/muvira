import type { ProductDetail } from '../types/product'

const factLabels: Record<string, string> = {
  material: 'Material',
  color: 'Color',
  colour: 'Color',
  height: 'Height',
  length: 'Length',
  width: 'Width',
  'width breadth': 'Width',
  dimensions: 'Dimensions',
  finish: 'Finish',
  style: 'Style',
  'package includes': 'Package includes',
  weight: 'Weight',
}
const normalize = (label: string) =>
  label.toLowerCase().replace(/[_()]/g, ' ').replace(/\s+/g, ' ').trim()

/** Only explicit labeled catalog facts become specifications; prose stays untouched. */
export function productSpecifications(product: Pick<ProductDetail, 'description' | 'metadata'>) {
  const facts = new Map<string, { label: string; value: string }>()
  for (const line of (product.description || '').split(/\r?\n/)) {
    const match = line
      .trim()
      .replace(/^[-*•]\s*/, '')
      .match(/^([A-Za-z ()]+):\s*(.+)$/)
    if (!match) continue
    const key = normalize(match[1])
    const canonical = key === 'colour' ? 'color' : key === 'width breadth' ? 'width' : key
    if (factLabels[key]) facts.set(canonical, { label: factLabels[key], value: match[2].trim() })
  }
  for (const [label, value] of Object.entries(product.metadata ?? {})) {
    const key = normalize(label)
    if (typeof value !== 'string' || !value.trim() || /care/i.test(key)) continue
    const canonical = key === 'colour' ? 'color' : key === 'width breadth' ? 'width' : key
    facts.set(canonical, {
      label: factLabels[key] || label.replaceAll('_', ' '),
      value: value.trim(),
    })
  }
  return [...facts.values()]
}

export function productHighlights(product: Pick<ProductDetail, 'description' | 'metadata'>) {
  return productSpecifications(product)
    .filter((fact) => /^(Material|Dimensions|Height|Finish)$/.test(fact.label))
    .slice(0, 4)
}
