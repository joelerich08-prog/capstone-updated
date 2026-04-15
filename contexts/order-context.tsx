'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { Order, OrderStatus } from '@/lib/types'
import { apiFetch, isApiErrorWithStatus } from '@/lib/api-client'
import { isValidPhoneNumber } from '@/lib/utils/validation'
import { useAuth } from '@/contexts/auth-context'

interface OrderContextType {
  orders: Order[]
  isLoading: boolean
  refreshOrders: () => Promise<void>
  addOrder: (order: Omit<Order, 'id' | 'orderNo' | 'createdAt'>) => Promise<Order | null>
  cancelOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<{ success: boolean; error?: string }>
  getOrdersByStatus: (status: OrderStatus) => Order[]
  getPendingOrdersCount: () => number
  getOrdersForUser: (userId: string) => Order[]
  lookupOrder: (orderNo: string, phone: string) => Order | null
  validateOrder: (order: Omit<Order, 'id' | 'orderNo' | 'createdAt'>) => { valid: boolean; error?: string }
}

const OrderContext = createContext<OrderContextType | undefined>(undefined)

const MAX_ORDERS_PER_MINUTE = 5

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, isLoading: isAuthLoading } = useAuth()
  
  // Track recent orders using useRef to persist across renders but not HMR
  const recentOrderTimestamps = useRef<number[]>([])

  // Fetch orders from API on mount
  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        const data = await apiFetch<Order[]>('/api/orders/get_all.php')
        const ordersWithDates = (data as any[]).map(order => ({
          ...order,
          createdAt: new Date(order.createdAt),
        }))
        setOrders(ordersWithDates)
      } catch (error) {
        if (isApiErrorWithStatus(error, 401)) {
          setOrders([])
          return
        }
        console.error('Failed to load orders:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchOrders()
      return
    }

    setOrders([])
    setIsLoading(false)
  }, [user, isAuthLoading])

  const refreshOrders = useCallback(async () => {
    try {
      const data = await apiFetch<Order[]>('/api/orders/get_all.php')
      const ordersWithDates = (data as any[]).map(order => ({
        ...order,
        createdAt: new Date(order.createdAt),
      }))
      setOrders(ordersWithDates)
    } catch (error) {
      console.error('Failed to refresh orders:', error)
    }
  }, [])

  // Validate order data to prevent fake orders
  const validateOrder = useCallback((orderData: Omit<Order, 'id' | 'orderNo' | 'createdAt'>): { valid: boolean; error?: string } => {
    // Check for required fields
    if (!orderData.customerName || orderData.customerName.trim().length < 2) {
      return { valid: false, error: 'Customer name is required and must be at least 2 characters' }
    }

    // Validate phone number format using shared utility
    if (!isValidPhoneNumber(orderData.customerPhone)) {
      return { valid: false, error: 'Please enter a valid Philippine phone number' }
    }

    // Check for empty cart
    if (!orderData.items || orderData.items.length === 0) {
      return { valid: false, error: 'Cannot place an order with no items' }
    }

    // Validate each item
    for (const item of orderData.items) {
      if (!item.productId || !item.productName) {
        return { valid: false, error: 'Invalid product in order' }
      }
      if (item.quantity < 1 || !Number.isInteger(item.quantity)) {
        return { valid: false, error: 'Invalid quantity for ' + item.productName }
      }
      if (item.unitPrice <= 0) {
        return { valid: false, error: 'Invalid price for ' + item.productName }
      }
    }

    // Validate total matches computed total
    const computedTotal = orderData.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
    if (Math.abs(computedTotal - orderData.total) > 0.01) {
      return { valid: false, error: 'Order total mismatch - please refresh and try again' }
    }

    // Rate limiting - prevent order spam
    // NOTE: This is client-side rate limiting only. In production, this should be implemented
    // server-side using Redis or a database to prevent bypass and ensure data integrity.
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    
    // Remove old timestamps
    while (recentOrderTimestamps.current.length > 0 && recentOrderTimestamps.current[0] < oneMinuteAgo) {
      recentOrderTimestamps.current.shift()
    }
    
    if (recentOrderTimestamps.current.length >= MAX_ORDERS_PER_MINUTE) {
      return { valid: false, error: 'Too many orders. Please wait a moment and try again.' }
    }

    return { valid: true }
  }, [])

  const addOrder = useCallback(async (orderData: Omit<Order, 'id' | 'orderNo' | 'createdAt'>): Promise<Order | null> => {
    // Validate order before creating
    const validation = validateOrder(orderData)
    if (!validation.valid) {
      // Validation error is returned via the validation result - caller should handle it
      return null
    }

    // Track order timestamp for rate limiting
    recentOrderTimestamps.current.push(Date.now())

    try {
      const newOrder = await apiFetch<Order>('/api/orders/create.php', {
        method: 'POST',
        body: {
          items: orderData.items,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          total: orderData.total,
          source: orderData.source,
          notes: orderData.notes,
        },
      })
      newOrder.createdAt = new Date(newOrder.createdAt)
      
      // Add to local state
      setOrders(prev => [newOrder, ...prev])
      
      return newOrder
    } catch (error) {
      console.error('Network error creating order:', error)
      return null
    }
  }, [validateOrder])

  // Cancel an order — only allowed if status is 'pending'
  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiFetch('/api/orders/update_status.php', {
        method: 'POST',
        body: { orderId, status },
      })

      setOrders(prev => prev.map(order => (order.id === orderId ? { ...order, status } : order)))
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error occurred'
      return { success: false, error: message }
    }
  }, [])

  const cancelOrder = useCallback(async (orderId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiFetch('/api/orders/update_status.php', {
        method: 'POST',
        body: { orderId, status: 'cancelled' },
      })
      
      // Update local state
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as OrderStatus } : o)
      )

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error occurred'
      return { success: false, error: message }
    }
  }, [])

  const getOrdersByStatus = useCallback((status: OrderStatus) => {
    return orders.filter(order => order.status === status)
  }, [orders])

  const getPendingOrdersCount = useCallback(() => {
    return orders.filter(order => 
      order.status === 'pending' || order.status === 'preparing' || order.status === 'ready'
    ).length
  }, [orders])

  // Get orders for a specific logged-in user
  const getOrdersForUser = useCallback((userId: string) => {
    return orders.filter(order => order.userId === userId)
  }, [orders])

  // Lookup order by order number and phone for guests
  const lookupOrder = useCallback((orderNo: string, phone: string): Order | null => {
    const cleanPhone = phone.replace(/[\s-]/g, '')
    const cleanOrderNo = orderNo.trim().toUpperCase()
    
    const order = orders.find(o => {
      const orderPhone = o.customerPhone.replace(/[\s-]/g, '')
      const matchesOrderNo = o.orderNo.toUpperCase() === cleanOrderNo || 
                             o.id.toUpperCase().includes(cleanOrderNo.replace('ORD-', ''))
      const matchesPhone = orderPhone === cleanPhone || 
                           orderPhone.endsWith(cleanPhone.slice(-10)) ||
                           cleanPhone.endsWith(orderPhone.slice(-10))
      return matchesOrderNo && matchesPhone
    })
    
    return order || null
  }, [orders])

  return (
    <OrderContext.Provider value={{
      orders,
      isLoading,
      refreshOrders,
      addOrder,
      cancelOrder,
      updateOrderStatus,
      getOrdersByStatus,
      getPendingOrdersCount,
      getOrdersForUser,
      lookupOrder,
      validateOrder,
    }}>
      {children}
    </OrderContext.Provider>
  )
}

export function useOrders() {
  const context = useContext(OrderContext)
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider')
  }
  return context
}
