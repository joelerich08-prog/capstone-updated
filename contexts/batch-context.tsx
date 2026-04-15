'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { differenceInDays } from 'date-fns'
import { apiFetch, isApiErrorWithStatus } from '@/lib/api-client'
import type { ProductBatch, BatchStatus, InventoryTier } from '@/lib/types'
import { useAuth } from '@/contexts/auth-context'

// Constants for expiry warnings
const EXPIRY_WARNING_DAYS = 30
const EXPIRY_CRITICAL_DAYS = 7

// Callback type for syncing with inventory context
type InventorySyncCallback = (
  productId: string,
  tier: InventoryTier,
  quantityChange: number,
  reason: string,
  notes: string,
  userName: string,
  variantId?: string
) => Promise<{ success: boolean; error?: string }>

interface BatchContextType {
  batches: ProductBatch[]
  isLoading: boolean
  
  // Query operations
  getBatchesByProductId: (productId: string) => ProductBatch[]
  getActiveBatchesFEFO: (productId: string) => ProductBatch[]
  getExpiringBatches: (warningDays?: number) => ProductBatch[]
  getExpiredBatches: () => ProductBatch[]
  getCriticalBatches: () => ProductBatch[]
  getBatchSummary: () => {
    total: number
    active: number
    expiringSoon: number
    expired: number
    disposed: number
    valueAtRisk: number
  }
  
  refreshBatches: () => Promise<void>
  
  // Stock calculation from batches
  getTotalStockFromBatches: (productId: string) => {
    wholesale: number
    retail: number
    shelf: number
  }
  
  // Mutation operations
  addBatch: (batch: Omit<ProductBatch, 'id' | 'status'>) => Promise<{ success: boolean; batch?: ProductBatch; error?: string }>
  updateBatchStock: (
    batchId: string,
    tier: InventoryTier,
    quantityChange: number
  ) => Promise<{ success: boolean; newQty?: number; error?: string }>
  disposeBatch: (
    batchId: string, 
    reason?: string,
    syncCallback?: InventorySyncCallback,
    userName?: string
  ) => Promise<{ success: boolean; error?: string; disposedQuantities?: { wholesale: number; retail: number; shelf: number } }>
  
  // FEFO operations - now with optional sync callback
  consumeStockFEFO: (
    productId: string,
    tier: InventoryTier,
    quantity: number,
    syncCallback?: InventorySyncCallback,
    userName?: string
  ) => Promise<{ success: boolean; error?: string; consumedFrom: Array<{ batchId: string; quantity: number }> }>
  
  // Rollback consumption - restores batches and optionally syncs inventory
  rollbackConsumption: (
    consumedFrom: Array<{ batchId: string; quantity: number; tier: InventoryTier; productId: string }>,
    syncCallback?: InventorySyncCallback,
    userName?: string
  ) => Promise<{ success: boolean; error?: string }>
  
  // Utility
  refreshBatchStatuses: () => void
}

const BatchContext = createContext<BatchContextType | undefined>(undefined)

export function BatchProvider({ children }: { children: ReactNode }) {
  const [batches, setBatches] = useState<ProductBatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, isLoading: isAuthLoading } = useAuth()

  // Refresh batch statuses based on current date
  const refreshBatchStatuses = useCallback(() => {
    const now = new Date()
    setBatches(prev =>
      prev.map(batch => {
        if (batch.status === 'disposed') return batch
        
        const daysUntilExpiry = differenceInDays(batch.expirationDate, now)
        let newStatus: BatchStatus = 'active'
        
        if (daysUntilExpiry <= 0) {
          newStatus = 'expired'
        } else if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) {
          newStatus = 'expiring_soon'
        }
        
        return batch.status !== newStatus ? { ...batch, status: newStatus } : batch
      })
    )
  }, [])

  const refreshBatches = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await apiFetch<ProductBatch[]>('/api/batches/get_all.php')
      const batchesWithDates = (data as any[]).map(batch => ({
        ...batch,
        expirationDate: new Date(batch.expirationDate),
        receivedDate: new Date(batch.receivedDate),
        manufacturingDate: batch.manufacturingDate ? new Date(batch.manufacturingDate) : undefined,
      }))
      setBatches(batchesWithDates)
    } catch (error) {
      if (isApiErrorWithStatus(error, 401)) {
        setBatches([])
        return
      }
      console.error('Failed to load batches:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (!user) {
      setBatches([])
      setIsLoading(false)
      return
    }

    refreshBatches()
    refreshBatchStatuses()

    const intervalId = setInterval(() => {
      refreshBatchStatuses()
    }, 60 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [refreshBatchStatuses, refreshBatches, user, isAuthLoading])

  // Get batches for a specific product
  const getBatchesByProductId = useCallback(
    (productId: string) => {
      return batches.filter(b => b.productId === productId)
    },
    [batches]
  )

  // Get active batches sorted by expiry (FEFO)
  const getActiveBatchesFEFO = useCallback(
    (productId: string) => {
      return batches
        .filter(
          b =>
            b.productId === productId &&
            b.status !== 'disposed' &&
            b.status !== 'expired'
        )
        .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime())
    },
    [batches]
  )

  // Get batches expiring soon
  const getExpiringBatches = useCallback(
    (warningDays: number = EXPIRY_WARNING_DAYS) => {
      const now = new Date()
      return batches
        .filter(batch => {
          const daysUntilExpiry = differenceInDays(batch.expirationDate, now)
          return (
            daysUntilExpiry > 0 &&
            daysUntilExpiry <= warningDays &&
            batch.status !== 'disposed'
          )
        })
        .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime())
    },
    [batches]
  )

  // Get critical batches (expiring within critical days)
  const getCriticalBatches = useCallback(() => {
    const now = new Date()
    return batches
      .filter(batch => {
        const daysUntilExpiry = differenceInDays(batch.expirationDate, now)
        return (
          daysUntilExpiry > 0 &&
          daysUntilExpiry <= EXPIRY_CRITICAL_DAYS &&
          batch.status !== 'disposed'
        )
      })
      .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime())
  }, [batches])

  // Get expired batches
  const getExpiredBatches = useCallback(() => {
    const now = new Date()
    return batches.filter(batch => {
      const daysUntilExpiry = differenceInDays(batch.expirationDate, now)
      return daysUntilExpiry <= 0 && batch.status !== 'disposed'
    })
  }, [batches])

  // Get batch summary statistics
  const getBatchSummary = useCallback(() => {
    const now = new Date()
    const total = batches.length
    const active = batches.filter(b => b.status === 'active').length
    const expiringSoon = batches.filter(b => {
      const days = differenceInDays(b.expirationDate, now)
      return days > 0 && days <= EXPIRY_WARNING_DAYS && b.status !== 'disposed'
    }).length
    const expired = batches.filter(
      b =>
        b.status === 'expired' || differenceInDays(b.expirationDate, now) <= 0
    ).length
    const disposed = batches.filter(b => b.status === 'disposed').length

    // Calculate value at risk (items expiring soon)
    const valueAtRisk = batches
      .filter(b => {
        const days = differenceInDays(b.expirationDate, now)
        return days > 0 && days <= EXPIRY_WARNING_DAYS && b.status !== 'disposed'
      })
      .reduce(
        (sum, b) =>
          sum + (b.wholesaleQty + b.retailQty + b.shelfQty) * b.costPrice,
        0
      )

    return {
      total,
      active,
      expiringSoon,
      expired,
      disposed,
      valueAtRisk,
    }
  }, [batches])

  // Get total stock from all batches for a product
  const getTotalStockFromBatches = useCallback(
    (productId: string) => {
      const productBatches = batches.filter(
        b => b.productId === productId && b.status !== 'disposed'
      )
      return productBatches.reduce(
        (acc, batch) => ({
          wholesale: acc.wholesale + batch.wholesaleQty,
          retail: acc.retail + batch.retailQty,
          shelf: acc.shelf + batch.shelfQty,
        }),
        { wholesale: 0, retail: 0, shelf: 0 }
      )
    },
    [batches]
  )

  // Add a new batch
  const addBatch = useCallback(async (batchData: Omit<ProductBatch, 'id' | 'status'>) => {
    try {
      const data = await apiFetch<{ batch: ProductBatch }>('/api/batches/create.php', {
        method: 'POST',
        body: batchData,
      })
      const batch = {
        ...data.batch,
        expirationDate: new Date(data.batch.expirationDate),
        receivedDate: new Date(data.batch.receivedDate),
        manufacturingDate: data.batch.manufacturingDate ? new Date(data.batch.manufacturingDate) : undefined,
      }

      setBatches(prev => [...prev, batch])
      return { success: true, batch }
    } catch (error) {
      return { success: false, error: 'Network error occurred' }
    }
  }, [])

  // Update batch stock
  const updateBatchStock = useCallback(async (batchId: string, tier: InventoryTier, quantityChange: number) => {
    try {
      const data = await apiFetch<{ newQty: number }>('/api/batches/update_stock.php', {
        method: 'POST',
        body: { batchId, tier, quantityChange },
      })
      setBatches(prev =>
        prev.map(b => {
          if (b.id === batchId) {
            const updated = { ...b }
            const key = tier === 'wholesale' ? 'wholesaleQty' : tier === 'retail' ? 'retailQty' : 'shelfQty'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(updated as any)[key] = data.newQty
            return updated
          }
          return b
        })
      )
      return { success: true, newQty: data.newQty }
    } catch (error) {
      return { success: false, error: 'Network error occurred' }
    }
  }, [])

  // Dispose a batch (mark as disposed) - now syncs with inventory
  const disposeBatch = useCallback(async (
    batchId: string,
    reason?: string,
    syncCallback?: InventorySyncCallback,
    userName: string = 'System'
  ) => {
    const batch = batches.find(b => b.id === batchId)
    if (!batch) {
      return { success: false, error: 'Batch not found' }
    }

    const disposedQuantities = {
      wholesale: batch.wholesaleQty,
      retail: batch.retailQty,
      shelf: batch.shelfQty,
    }

    try {
      await apiFetch('/api/batches/dispose.php', {
        method: 'POST',
        body: { batchId, reason },
      })

      setBatches(prev =>
        prev.map(b => {
          if (b.id === batchId) {
            return {
              ...b,
              status: 'disposed' as BatchStatus,
              wholesaleQty: 0,
              retailQty: 0,
              shelfQty: 0,
              notes: reason
                ? `${b.notes ? b.notes + ' | ' : ''}Disposed: ${reason}`
                : b.notes,
            }
          }
          return b
        })
      )

      if (syncCallback) {
        const disposeReason = reason || 'Batch disposal'
        if (disposedQuantities.wholesale > 0) {
          await syncCallback(batch.productId, 'wholesale', -disposedQuantities.wholesale, 'Disposal', disposeReason, userName, batch.variantId)
        }
        if (disposedQuantities.retail > 0) {
          await syncCallback(batch.productId, 'retail', -disposedQuantities.retail, 'Disposal', disposeReason, userName, batch.variantId)
        }
        if (disposedQuantities.shelf > 0) {
          await syncCallback(batch.productId, 'shelf', -disposedQuantities.shelf, 'Disposal', disposeReason, userName, batch.variantId)
        }
      }

      return { success: true, disposedQuantities }
    } catch (error) {
      return { success: false, error: 'Network error occurred' }
    }
  }, [batches])

  // Consume stock using FEFO (First Expired First Out) - now syncs with inventory and backend
  const consumeStockFEFO = useCallback(async (
    productId: string,
    tier: InventoryTier,
    quantity: number,
    syncCallback?: InventorySyncCallback,
    userName: string = 'System'
  ) => {
    const activeBatches = batches
      .filter(
        b =>
          b.productId === productId &&
          b.status !== 'disposed' &&
          b.status !== 'expired'
      )
      .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime())

    let totalAvailable = 0
    activeBatches.forEach(b => {
      if (tier === 'wholesale') totalAvailable += b.wholesaleQty
      else if (tier === 'retail') totalAvailable += b.retailQty
      else if (tier === 'shelf') totalAvailable += b.shelfQty
    })

    if (quantity > totalAvailable) {
      return {
        success: false,
        error: 'Insufficient stock across all batches',
        consumedFrom: [],
      }
    }

    let remaining = quantity
    const consumedFrom: Array<{ batchId: string; quantity: number }> = []

    for (const batch of activeBatches) {
      if (remaining <= 0) break

      let batchQty = 0
      if (tier === 'wholesale') batchQty = batch.wholesaleQty
      else if (tier === 'retail') batchQty = batch.retailQty
      else if (tier === 'shelf') batchQty = batch.shelfQty

      if (batchQty > 0) {
        const toConsume = Math.min(remaining, batchQty)
        remaining -= toConsume
        consumedFrom.push({ batchId: batch.id, quantity: toConsume })
      }
    }

    for (const consumption of consumedFrom) {
      const result = await updateBatchStock(consumption.batchId, tier, -consumption.quantity)
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to persist batch consumption', consumedFrom: [] }
      }
    }

    if (syncCallback) {
      await syncCallback(productId, tier, -quantity, 'Sale', `FEFO consumption`, userName)
    }

    return { success: true, consumedFrom }
  }, [batches, updateBatchStock])

  // Rollback batch consumption - restores quantities to batches
  const rollbackConsumption = useCallback(async (
    consumedFrom: Array<{ batchId: string; quantity: number; tier: InventoryTier; productId: string }>,
    syncCallback?: InventorySyncCallback,
    userName: string = 'System'
  ) => {
    for (const consumption of consumedFrom) {
      const result = await updateBatchStock(consumption.batchId, consumption.tier, consumption.quantity)
      if (!result.success) {
        console.error('Failed to rollback batch consumption for batch', consumption.batchId, result.error)
      }
    }

    if (syncCallback) {
      const groupedByProductTier = new Map<string, number>()
      consumedFrom.forEach(c => {
        const key = `${c.productId}-${c.tier}`
        const existing = groupedByProductTier.get(key) || 0
        groupedByProductTier.set(key, existing + c.quantity)
      })

      groupedByProductTier.forEach((quantity, key) => {
        const [productId, tier] = key.split('-')
        void syncCallback(productId, tier as InventoryTier, quantity, 'Rollback', 'Payment failure rollback', userName)
      })
    }

    return { success: true }
  }, [updateBatchStock])

  return (
    <BatchContext.Provider
      value={{
        batches,
        isLoading,
        getBatchesByProductId,
        getActiveBatchesFEFO,
        getExpiringBatches,
        getExpiredBatches,
        getCriticalBatches,
        getBatchSummary,
        getTotalStockFromBatches,
        addBatch,
        updateBatchStock,
        disposeBatch,
        consumeStockFEFO,
        rollbackConsumption,
        refreshBatches,
        refreshBatchStatuses,
      }}
    >
      {children}
    </BatchContext.Provider>
  )
}

export function useBatches() {
  const context = useContext(BatchContext)
  if (context === undefined) {
    throw new Error('useBatches must be used within a BatchProvider')
  }
  return context
}
