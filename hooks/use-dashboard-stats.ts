'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'

export interface DashboardTopProduct {
  productId: string
  productName: string
  totalQuantity: number
}

export interface DashboardStats {
  todaySales: number
  todayProfit: number
  lowStockCount: number
  topProducts: DashboardTopProduct[]
}

const defaultDashboardStats: DashboardStats = {
  todaySales: 0,
  todayProfit: 0,
  lowStockCount: 0,
  topProducts: [],
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>(defaultDashboardStats)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshDashboardStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await apiFetch<DashboardStats>('/api/reports/dashboard_summary.php')
      setStats({
        todaySales: data.todaySales ?? 0,
        todayProfit: data.todayProfit ?? 0,
        lowStockCount: data.lowStockCount ?? 0,
        topProducts: Array.isArray(data.topProducts) ? data.topProducts : [],
      })
    } catch (err) {
      console.error('Failed to load dashboard stats:', err)
      setError(err instanceof Error ? err.message : String(err))
      setStats(defaultDashboardStats)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshDashboardStats()
  }, [refreshDashboardStats])

  return {
    stats,
    isLoading,
    error,
    refreshDashboardStats,
  }
}
