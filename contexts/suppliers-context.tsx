'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Supplier } from '@/lib/types'
import { apiFetch } from '@/lib/api-client'

interface SuppliersContextType {
  suppliers: Supplier[]
  isLoading: boolean
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>
  refreshSuppliers: () => Promise<void>
  getSupplierById: (id: string) => Supplier | undefined
  getActiveSuppliers: () => Supplier[]
}

const SuppliersContext = createContext<SuppliersContextType | undefined>(undefined)

export function SuppliersProvider({ children }: { children: ReactNode }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch suppliers from API on mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setIsLoading(true)
        const data = await apiFetch<Supplier[]>('/api/suppliers/get_all.php')
        setSuppliers(data)
      } catch (error) {
        console.error('Failed to load suppliers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSuppliers()
  }, [])

  const refreshSuppliers = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await apiFetch<Supplier[]>('/api/suppliers/get_all.php')
      setSuppliers(data)
    } catch (error) {
      console.error('Failed to refresh suppliers:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getSupplierById = useCallback((id: string) => {
    return suppliers.find(supplier => supplier.id === id)
  }, [suppliers])

  const getActiveSuppliers = useCallback(() => {
    return suppliers.filter(supplier => supplier.isActive)
  }, [suppliers])

  return (
    <SuppliersContext.Provider
      value={{
        suppliers,
        isLoading,
        setSuppliers,
        refreshSuppliers,
        getSupplierById,
        getActiveSuppliers,
      }}
    >
      {children}
    </SuppliersContext.Provider>
  )
}

export function useSuppliers() {
  const context = useContext(SuppliersContext)
  if (context === undefined) {
    throw new Error('useSuppliers must be used within a SuppliersProvider')
  }
  return context
}
