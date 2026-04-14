'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Category } from '@/lib/types'
import { apiFetch } from '@/lib/api-client'

interface CategoriesContextType {
  categories: Category[]
  isLoading: boolean
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>
  refreshCategories: () => Promise<void>
  getCategoryById: (id: string) => Category | undefined
  getActiveCategories: () => Category[]
  getCategoriesByParent: (parentId?: string) => Category[]
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined)

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch categories from API on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true)
        const data = await apiFetch<Category[]>('/api/categories/get_all.php')
        setCategories(data)
      } catch (error) {
        console.error('Failed to load categories:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const refreshCategories = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await apiFetch<Category[]>('/api/categories/get_all.php')
      setCategories(data)
    } catch (error) {
      console.error('Failed to refresh categories:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getCategoryById = useCallback((id: string) => {
    return categories.find(category => category.id === id)
  }, [categories])

  const getActiveCategories = useCallback(() => {
    return categories.filter(category => category.isActive)
  }, [categories])

  const getCategoriesByParent = useCallback((parentId?: string) => {
    return categories.filter(category => category.parentId === parentId)
  }, [categories])

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        isLoading,
        setCategories,
        refreshCategories,
        getCategoryById,
        getActiveCategories,
        getCategoriesByParent,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  const context = useContext(CategoriesContext)
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoriesProvider')
  }
  return context
}
