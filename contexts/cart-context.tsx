'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { CartItem } from '@/lib/types'
import { apiFetch } from '@/lib/api-client'

interface CartContextType {
  items: CartItem[]
  subtotal: number
  discount: number
  total: number
  itemCount: number
  isLoading: boolean
  addItem: (item: Omit<CartItem, 'subtotal'>) => void
  removeItem: (productId: string, variantId?: string, productName?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string, productName?: string) => void
  setDiscount: (discount: number) => void
  clearCart: () => void
  getItemKey: (productId: string, variantId?: string, productName?: string) => string
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [discount, setDiscountAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const syncCart = useCallback(async (updatedItems: CartItem[]) => {
    try {
      await apiFetch('/api/cart/update.php', {
        method: 'POST',
        body: { items: updatedItems },
      })
    } catch (error) {
      console.error('Failed to sync cart with server:', error)
    }
  }, [])

  useEffect(() => {
    const fetchCart = async () => {
      try {
        setIsLoading(true)
        const data = await apiFetch<CartItem[]>('/api/cart/get.php')
        setItems(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to load cart:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCart()
  }, [])

  const getItemKey = useCallback((productId: string, variantId?: string, productName?: string) => {
    const base = variantId ? `${productId}-${variantId}` : productId
    return productName ? `${base}-${productName}` : base
  }, [])

  const addItem = useCallback((newItem: Omit<CartItem, 'subtotal'>) => {
    setItems(currentItems => {
      const key = getItemKey(newItem.productId, newItem.variantId, newItem.productName)
      const existingIndex = currentItems.findIndex(
        item => getItemKey(item.productId, item.variantId, item.productName) === key
      )

      const updated = [...currentItems]
      if (existingIndex >= 0) {
        const existing = updated[existingIndex]
        const newQuantity = existing.quantity + newItem.quantity
        updated[existingIndex] = {
          ...existing,
          quantity: newQuantity,
          subtotal: existing.unitPrice * newQuantity,
        }
      } else {
        updated.push({
          ...newItem,
          subtotal: newItem.unitPrice * newItem.quantity,
        })
      }

      void syncCart(updated)
      return updated
    })
  }, [getItemKey, syncCart])

  const removeItem = useCallback((productId: string, variantId?: string, productName?: string) => {
    setItems(currentItems => {
      const updated = currentItems.filter(
        item => getItemKey(item.productId, item.variantId, item.productName) !== getItemKey(productId, variantId, productName)
      )
      void syncCart(updated)
      return updated
    })
  }, [getItemKey, syncCart])

  const updateQuantity = useCallback((productId: string, quantity: number, variantId?: string, productName?: string) => {
    if (quantity <= 0) {
      removeItem(productId, variantId, productName)
      return
    }

    setItems(currentItems => {
      const updated = currentItems.map(item => {
        if (getItemKey(item.productId, item.variantId, item.productName) === getItemKey(productId, variantId, productName)) {
          return {
            ...item,
            quantity,
            subtotal: item.unitPrice * quantity,
          }
        }
        return item
      })
      void syncCart(updated)
      return updated
    })
  }, [getItemKey, removeItem, syncCart])

  const setDiscount = useCallback((amount: number) => {
    setDiscountAmount(Math.max(0, amount))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setDiscountAmount(0)
    void apiFetch('/api/cart/clear.php', { method: 'POST' }).catch(error => console.error('Failed to clear cart:', error))
  }, [])

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const total = Math.max(0, subtotal - discount)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        discount,
        total,
        itemCount,
        isLoading,
        addItem,
        removeItem,
        updateQuantity,
        setDiscount,
        clearCart,
        getItemKey,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
