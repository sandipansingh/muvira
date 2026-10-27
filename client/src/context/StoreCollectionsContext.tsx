import React, { createContext, useContext, useEffect, useState } from 'react'
import { categoryService } from '../lib/services/category.service'
import type { Category } from '../lib/types/category'

const StoreCollectionsContext = createContext<{
  categories: Category[]
  loading: boolean
  error: string | null
}>({ categories: [], loading: true, error: null })

export function StoreCollectionsProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void categoryService
      .getCategories()
      .then((response) => {
        if (!response.success) throw new Error(response.error.message)
        if (active)
          setCategories(
            response.data
              .filter((category) => category.isActive !== false)
              .sort((a, b) => a.sortOrder - b.sortOrder)
          )
      })
      .catch((reason: unknown) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Collections could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  return (
    <StoreCollectionsContext.Provider value={{ categories, loading, error }}>
      {children}
    </StoreCollectionsContext.Provider>
  )
}

export const useStoreCollections = () => useContext(StoreCollectionsContext)
