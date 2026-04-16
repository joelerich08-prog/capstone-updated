'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Transaction, TransactionItem, PaymentType } from '@/lib/types'
import { apiFetch, isApiErrorWithStatus } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'
import { validateTransaction, validateRefundRequest } from '@/lib/utils/transaction-validation'

interface TransactionContextType {
  transactions: Transaction[]
  isLoading: boolean
  refreshTransactions: () => Promise<void>
  addTransaction: (transaction: Omit<Transaction, 'id' | 'invoiceNo' | 'createdAt' | 'cashierId' | 'status'> & Partial<Pick<Transaction, 'cashierId' | 'status'>> & { invoiceNo?: string }) => Promise<{ transaction: Transaction | null; error?: string }>
  refundTransaction: (transactionId: string, reason?: string) => Promise<{ success: boolean; error?: string }>
  getTransactionById: (id: string) => Transaction | undefined
  getTodayTransactions: () => Transaction[]
  getYesterdayTransactions: () => Transaction[]
  getTodayStats: () => { sales: number; count: number; profit: number }
  getYesterdayStats: () => { sales: number; count: number; profit: number }
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined)
const isCompletedTransaction = (transaction: Transaction) => transaction.status === 'completed'

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, isLoading: isAuthLoading } = useAuth()

  // Fetch transactions from API on mount
  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (!user) {
      setTransactions([])
      setIsLoading(false)
      return
    }

    const fetchTransactions = async () => {
      try {
        setIsLoading(true)
        const data = await apiFetch<Transaction[]>('/api/transactions/get_history.php')
        const transactionsWithDates = (data as any[]).map(tx => ({
          ...tx,
          createdAt: new Date(tx.createdAt),
        }))
        setTransactions(transactionsWithDates)
      } catch (error) {
        if (isApiErrorWithStatus(error, 401)) {
          setTransactions([])
          return
        }
        console.error('Failed to load transactions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [user, isAuthLoading])

  const refreshTransactions = useCallback(async () => {
    try {
      const data = await apiFetch<Transaction[]>('/api/transactions/get_history.php')
      const transactionsWithDates = (data as any[]).map(tx => ({
        ...tx,
        createdAt: new Date(tx.createdAt),
      }))
      setTransactions(transactionsWithDates)
    } catch (error) {
      console.error('Failed to refresh transactions:', error)
    }
  }, [])

  const getTransactionById = useCallback((id: string): Transaction | undefined => {
    return transactions.find(tx => tx.id === id)
  }, [transactions])

  const getTodayTransactions = useCallback((): Transaction[] => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return transactions.filter(tx => {
      if (!isCompletedTransaction(tx)) {
        return false
      }
      const txDate = new Date(tx.createdAt)
      return txDate >= today && txDate < tomorrow
    })
  }, [transactions])

  const getYesterdayTransactions = useCallback((): Transaction[] => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    return transactions.filter(tx => {
      if (!isCompletedTransaction(tx)) {
        return false
      }
      const txDate = new Date(tx.createdAt)
      return txDate >= yesterday && txDate < today
    })
  }, [transactions])

  // Calculate profit from transaction items
  // Profit = sum of (unitPrice - costPrice) × quantity
  const calculateProfit = useCallback((txList: Transaction[]): number => {
    let totalProfit = 0
    txList.forEach(tx => {
      tx.items.forEach(item => {
        const costPrice = item.costPrice ?? 0
        const profitPerUnit = item.unitPrice - costPrice
        totalProfit += profitPerUnit * item.quantity
      })
    })
    return Math.max(totalProfit, 0) // Prevent negative profit display
  }, [])

  const getTodayStats = useCallback((): { sales: number; count: number; profit: number } => {
    const todayTx = getTodayTransactions()
    const sales = todayTx.reduce((sum, tx) => sum + tx.total, 0)
    return {
      sales,
      count: todayTx.length,
      profit: calculateProfit(todayTx),
    }
  }, [getTodayTransactions, calculateProfit])

  const addTransaction = useCallback(async (
    transactionData: Omit<Transaction, 'id' | 'invoiceNo' | 'createdAt' | 'cashierId' | 'status'> & Partial<Pick<Transaction, 'cashierId' | 'status'>> & { invoiceNo?: string }
  ): Promise<{ transaction: Transaction | null; error?: string }> => {
    // Validate transaction data before sending
    const validationErrors = validateTransaction(transactionData)
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.map(e => e.message).join('; ')
      return { transaction: null, error: `Validation failed: ${errorMessage}` }
    }

    try {
      const result = await apiFetch('/api/pos/checkout.php', {
        method: 'POST',
        body: {
          status: 'completed',
          ...transactionData,
        },
      })
      const rawTransaction = (result as any).transaction ?? result
      const transaction: Transaction = {
        ...rawTransaction,
        createdAt: new Date(rawTransaction.createdAt),
      }
      setTransactions(prev => [transaction, ...prev])
      return { transaction }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create transaction'
      console.error('Error creating transaction:', error)
      return { transaction: null, error: errorMessage }
    }
  }, [])

  const refundTransaction = useCallback(async (transactionId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    // Validate refund request
    const validationErrors = validateRefundRequest({ transactionId, reason })
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.map(e => e.message).join('; ')
      return { success: false, error: `Validation failed: ${errorMessage}` }
    }

    try {
      await apiFetch('/api/transactions/refund.php', {
        method: 'POST',
        body: {
          transactionId,
          reason,
        },
      })

      setTransactions(prev =>
        prev.map(transaction =>
          transaction.id === transactionId
            ? { ...transaction, status: 'refunded' }
            : transaction
        )
      )

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refund transaction'
      console.error('Error refunding transaction:', error)
      return { success: false, error: message }
    }
  }, [])

  const getYesterdayStats = useCallback((): { sales: number; count: number; profit: number } => {
    const yesterdayTx = getYesterdayTransactions()
    const sales = yesterdayTx.reduce((sum, tx) => sum + tx.total, 0)
    return {
      sales,
      count: yesterdayTx.length,
      profit: calculateProfit(yesterdayTx),
    }
  }, [getYesterdayTransactions, calculateProfit])

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        isLoading,
        refreshTransactions,
        addTransaction,
        refundTransaction,
        getTransactionById,
        getTodayTransactions,
        getYesterdayTransactions,
        getTodayStats,
        getYesterdayStats,
      }}
    >
      {children}
    </TransactionContext.Provider>
  )
}

export function useTransactions() {
  const context = useContext(TransactionContext)
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider')
  }
  return context
}
