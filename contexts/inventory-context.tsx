'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { InventoryLevel, InventoryTier } from '@/lib/types'
import { apiFetch, isApiErrorWithStatus } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'

const normalizeVariantId = (variantId?: string | null) => {
  const trimmed = variantId?.trim()
  return trimmed ? trimmed : undefined
}

const getInventoryIdentity = (productId: string, variantId?: string | null) =>
  `${productId}::${normalizeVariantId(variantId) ?? 'base'}`

const aggregateInventoryLevels = (productId: string, levels: InventoryLevel[]): InventoryLevel | undefined => {
  const matchingLevels = levels.filter((level) => level.productId === productId)
  if (matchingLevels.length === 0) {
    return undefined
  }

  const [firstLevel] = matchingLevels
  const latestUpdatedAt = matchingLevels.reduce(
    (latest, level) => (level.updatedAt > latest ? level.updatedAt : latest),
    firstLevel.updatedAt,
  )

  return {
    ...firstLevel,
    id: getInventoryIdentity(productId),
    variantId: undefined,
    wholesaleQty: matchingLevels.reduce((sum, level) => sum + level.wholesaleQty, 0),
    retailQty: matchingLevels.reduce((sum, level) => sum + level.retailQty, 0),
    shelfQty: matchingLevels.reduce((sum, level) => sum + level.shelfQty, 0),
    reorderLevel: matchingLevels.reduce((max, level) => Math.max(max, level.reorderLevel), 0),
    updatedAt: latestUpdatedAt,
  }
}

interface ActivityLogEntry {
  id: string
  type: 'receiving' | 'breakdown' | 'transfer' | 'adjustment'
  description: string
  details: string
  user: string
  timestamp: Date
}

interface InventoryContextType {
  inventoryLevels: InventoryLevel[]
  activityLog: ActivityLogEntry[]
  isLoading: boolean
  
  // Transfer operations
  transferStock: (
    productId: string,
    sourceTier: InventoryTier,
    destTier: InventoryTier,
    quantity: number,
    userName: string,
    variantId?: string
  ) => Promise<{ success: boolean; error?: string }>
  
  // Breakdown operations
  breakdownStock: (
    productId: string,
    quantity: number,
    userName: string,
    variantId?: string
  ) => Promise<{ success: boolean; error?: string; unitsProduced?: number }>
  
  // Receiving operations
  receiveStock: (
    items: Array<{
      productId: string
      variantId?: string
      variantName?: string
      productName?: string
      quantity: number
      cost: number
      tier?: InventoryTier
      batchNumber?: string
      expirationDate?: string
      manufacturingDate?: string
    }>,
    supplierId: string,
    supplier: string,
    invoiceNumber: string,
    notes: string,
    userName: string
  ) => Promise<{ success: boolean; error?: string }>
  
  // Get inventory for a product
  getInventory: (productId: string, variantId?: string) => InventoryLevel | undefined
  
  // Get stock for a specific tier
  getStock: (productId: string, tier: InventoryTier, variantId?: string) => number
  
  // Adjustment operations
  adjustStock: (
    productId: string,
    tier: InventoryTier,
    quantityChange: number,
    reason: string,
    notes: string,
    userName: string,
    variantId?: string
  ) => Promise<{ success: boolean; error?: string }>

  // Refresh inventory from API
  refreshInventory: () => Promise<void>
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [inventoryLevels, setInventoryLevels] = useState<InventoryLevel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])

  // Fetch inventory levels from API on mount
  const { toast } = useToast()
  const { user, isLoading: isAuthLoading } = useAuth()

  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (!user) {
      setInventoryLevels([])
      setIsLoading(false)
      return
    }

    const fetchInventory = async () => {
      try {
        setIsLoading(true)
        const data = await apiFetch<InventoryLevel[]>('/api/inventory/get_levels.php')
        const inventoryWithDates = (data as any[]).map(inv => ({
          ...inv,
          updatedAt: new Date(inv.updatedAt),
        }))
        setInventoryLevels(inventoryWithDates)
      } catch (error) {
        if (isApiErrorWithStatus(error, 401)) {
          setInventoryLevels([])
          return
        }
        const message = error instanceof Error ? error.message : 'Failed to load inventory levels'
        console.error('Failed to load inventory levels:', error)
        toast({
          title: 'Inventory load failed',
          description: message,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchInventory()
  }, [toast, user, isAuthLoading])

  const refreshInventory = useCallback(async () => {
    try {
      const data = await apiFetch<InventoryLevel[]>('/api/inventory/get_levels.php')
      const inventoryWithDates = (data as any[]).map(inv => ({
        ...inv,
        updatedAt: new Date(inv.updatedAt),
      }))
      setInventoryLevels(inventoryWithDates)
    } catch (error) {
      console.error('Failed to refresh inventory:', error)
    }
  }, [])

  const addActivityLog = useCallback((
    type: ActivityLogEntry['type'],
    description: string,
    details: string,
    user: string
  ) => {
    const newEntry: ActivityLogEntry = {
      id: `act_${Date.now()}`,
      type,
      description,
      details,
      user,
      timestamp: new Date(),
    }
    // Limit activity log to 100 entries to prevent memory issues
    setActivityLog(prev => [newEntry, ...prev].slice(0, 100))
  }, [])

  const getInventory = useCallback((productId: string, variantId?: string) => {
    const normalizedVariantId = normalizeVariantId(variantId)

    if (normalizedVariantId) {
      return inventoryLevels.find(
        (inv) => inv.productId === productId && normalizeVariantId(inv.variantId) === normalizedVariantId,
      )
    }

    const baseInventory = inventoryLevels.find(
      (inv) => inv.productId === productId && !normalizeVariantId(inv.variantId),
    )

    return baseInventory ?? aggregateInventoryLevels(productId, inventoryLevels)
  }, [inventoryLevels])

  const getStock = useCallback((productId: string, tier: InventoryTier, variantId?: string) => {
    const inventory = getInventory(productId, variantId)
    if (!inventory) return 0
    if (tier === 'wholesale') return inventory.wholesaleQty
    if (tier === 'retail') return inventory.retailQty
    if (tier === 'shelf') return inventory.shelfQty
    return 0
  }, [getInventory])

  const transferStock = useCallback(async (
    productId: string,
    sourceTier: InventoryTier,
    destTier: InventoryTier,
    quantity: number,
    userName: string,
    variantId?: string
  ) => {
    try {
      await apiFetch('/api/inventory/transfer.php', {
        method: 'POST',
        body: {
          productId,
          sourceTier,
          destTier,
          quantity,
          variantId,
        },
      })

      // Refresh inventory from API to get latest state
      await refreshInventory()

      // Add activity log entry
      const tierNames: Record<InventoryTier, string> = {
        wholesale: 'Wholesale',
        retail: 'Retail',
        shelf: 'Store Shelf',
      }
      addActivityLog(
        'transfer',
        `Transferred ${quantity} units from ${tierNames[sourceTier]} to ${tierNames[destTier]}`,
        `Product ID: ${productId}${variantId ? ` | Variant ID: ${variantId}` : ''}`,
        userName
      )

      toast({
        title: 'Stock transferred',
        description: `Moved ${quantity} units from ${tierNames[sourceTier]} to ${tierNames[destTier]}.`,
      })

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to transfer stock'
      toast({
        title: 'Transfer failed',
        description: message,
        variant: 'destructive',
      })
      return { success: false, error: message }
    }
  }, [refreshInventory, addActivityLog, toast])

  const breakdownStock = useCallback(async (
    productId: string,
    quantity: number,
    userName: string,
    variantId?: string
  ) => {
    try {
      const data = await apiFetch<{ retailQtyAdded: number }>('/api/inventory/breakdown.php', {
        method: 'POST',
        body: {
          productId,
          wholesaleQuantity: quantity,
          variantId,
        },
      })

      // Refresh inventory from API to get latest state
      await refreshInventory()

      // Add activity log entry
      const inventory = inventoryLevels.find(inv => inv.productId === productId)
      if (inventory) {
        addActivityLog(
          'breakdown',
          `Broke down ${quantity} ${inventory.wholesaleUnit}(s) into ${data.retailQtyAdded} ${inventory.retailUnit}(s)`,
          `Product ID: ${productId}`,
          userName
        )
      }

      toast({
        title: 'Stock breakdown completed',
        description: `Converted ${quantity} wholesale units into ${data.retailQtyAdded} retail units.`,
      })

      return { success: true, unitsProduced: data.retailQtyAdded }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to breakdown stock'
      toast({
        title: 'Breakdown failed',
        description: message,
        variant: 'destructive',
      })
      return { success: false, error: message }
    }
  }, [inventoryLevels, refreshInventory, addActivityLog, toast])

  const receiveStock = useCallback(async (
    items: Array<{
      productId: string
      variantId?: string
      variantName?: string
      productName?: string
      quantity: number
      cost: number
      tier?: InventoryTier
      batchNumber?: string
      expirationDate?: string
      manufacturingDate?: string
    }>,
    supplierId: string,
    supplier: string,
    invoiceNumber: string,
    notes: string,
    userName: string
  ) => {
    try {
      if (items.length === 0) {
        return { success: false, error: 'No items to receive' }
      }

      if (!supplierId.trim()) {
        return { success: false, error: 'Supplier is required' }
      }

      if (!invoiceNumber.trim()) {
        return { success: false, error: 'Invoice number is required' }
      }

      const trimmedNotes = notes.trim()

      await apiFetch('/api/inventory/receive_stock.php', {
        method: 'POST',
        body: {
          items,
          supplierId,
          supplier,
          invoiceNumber,
          notes: trimmedNotes,
        },
      })
      
      // Refresh inventory from API to get latest state
      await refreshInventory()

      // Add activity log entry
      const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
      const itemsList = items.map(i => `${i.productName} (${i.quantity})`).join(', ')
      addActivityLog(
        'receiving',
        `Received ${totalItems} units across ${items.length} product(s)`,
        `Supplier: ${supplier} | Invoice: ${invoiceNumber} | Items: ${itemsList}${trimmedNotes ? ` | Notes: ${trimmedNotes}` : ''}`,
        userName
      )

      toast({
        title: 'Stock received',
        description: `Received ${totalItems} total units from ${supplier}.`,
      })

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to receive stock'
      toast({
        title: 'Receiving failed',
        description: message,
        variant: 'destructive',
      })
      return { success: false, error: message }
    }
  }, [refreshInventory, addActivityLog, toast])

  const adjustStock = useCallback(async (
    productId: string,
    tier: InventoryTier,
    quantityChange: number,
    reason: string,
    notes: string,
    userName: string,
    variantId?: string
  ) => {
    try {
      if (quantityChange === 0) {
        return { success: false, error: 'Quantity change cannot be zero' }
      }

      await apiFetch('/api/inventory/adjust_stock.php', {
        method: 'POST',
        body: {
          productId,
          tier,
          quantityChange,
          reason,
          notes,
          variantId,
        },
      })
      
      // Refresh inventory from API to get latest state
      await refreshInventory()

      // Add activity log entry
      const tierNames: Record<InventoryTier, string> = {
        wholesale: 'Wholesale',
        retail: 'Retail',
        shelf: 'Store Shelf'
      }
      const action = quantityChange > 0 ? 'Added' : 'Removed'
      const absQuantity = Math.abs(quantityChange)
      addActivityLog(
        'adjustment',
        `${action} ${absQuantity} unit(s) ${quantityChange > 0 ? 'to' : 'from'} ${tierNames[tier]}`,
        `Product ID: ${productId} | Reason: ${reason} | Notes: ${notes}`,
        userName
      )

      toast({
        title: 'Stock adjusted',
        description: `${absQuantity} unit(s) ${quantityChange > 0 ? 'added to' : 'removed from'} ${tierNames[tier]}.`,
      })

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to adjust stock'
      toast({
        title: 'Adjustment failed',
        description: message,
        variant: 'destructive',
      })
      return { success: false, error: message }
    }
  }, [refreshInventory, addActivityLog, toast])

  return (
    <InventoryContext.Provider
      value={{
        inventoryLevels,
        activityLog,
        isLoading,
        transferStock,
        breakdownStock,
        receiveStock,
        getInventory,
        getStock,
        adjustStock,
        refreshInventory,
      }}
    >
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const context = useContext(InventoryContext)
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider')
  }
  return context
}
