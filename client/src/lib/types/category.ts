/**
 * Product Category domain interface.
 */
export interface Category {
  id: string
  name: string
  slug: string
  description: string
  imageUrl: string
  sortOrder: number
  itemCount?: number
  isActive?: boolean
  showInNavbar?: boolean
}
