'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Product, Category, Supplier } from '@/lib/types'
import { apiFetch } from '@/lib/api-client'

interface ProductsContextType {
  products: Product[]
  categories: Category[]
  suppliers: Supplier[]
  isLoading: boolean
  refreshProducts: () => Promise<void>
  getProductById: (id: string) => Product | undefined
  getCategoryById: (id: string) => Category | undefined
  getSupplierById: (id: string) => Supplier | undefined
  getProductsByCategory: (categoryId: string) => Product[]
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch products, categories, and suppliers from API on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch all data in parallel
        const [productsData, categoriesData, suppliersData] = await Promise.all([
          apiFetch<Product[]>('/api/products/get_all.php'),
          apiFetch<Category[]>('/api/categories/get_all.php'),
          apiFetch<Supplier[]>('/api/suppliers/get_all.php')
        ])
        
        // Process products with dates
        const productsWithDates = (productsData as any[]).map(product => ({
          ...product,
          createdAt: new Date(product.createdAt),
        }))
        
        setProducts(productsWithDates)
        setCategories(categoriesData)
        setSuppliers(suppliersData)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const refreshProducts = useCallback(async () => {
    try {
      const [productsData, categoriesData, suppliersData] = await Promise.all([
        apiFetch<Product[]>('/api/products/get_all.php'),
        apiFetch<Category[]>('/api/categories/get_all.php'),
        apiFetch<Supplier[]>('/api/suppliers/get_all.php')
      ])
      
      const productsWithDates = (productsData as any[]).map(product => ({
        ...product,
        createdAt: new Date(product.createdAt),
      }))
      
      setProducts(productsWithDates)
      setCategories(categoriesData)
      setSuppliers(suppliersData)
    } catch (error) {
      console.error('Failed to refresh data:', error)
    }
  }, [])

  const getProductById = useCallback((id: string): Product | undefined => {
    return products.find(p => p.id === id)
  }, [products])

  const getCategoryById = useCallback((id: string): Category | undefined => {
    return categories.find(c => c.id === id)
  }, [categories])

  const getSupplierById = useCallback((id: string): Supplier | undefined => {
    return suppliers.find(s => s.id === id)
  }, [suppliers])

  const getProductsByCategory = useCallback((categoryId: string): Product[] => {
    return products.filter(p => p.categoryId === categoryId)
  }, [products])

  const value: ProductsContextType = {
    products,
    categories,
    suppliers,
    isLoading,
    refreshProducts,
    getProductById,
    getCategoryById,
    getSupplierById,
    getProductsByCategory,
  }

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const context = useContext(ProductsContext)
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider')
  }
  return context
}