'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import type { DashboardSummaryStats } from '@/lib/types'

const defaultDashboardStats: DashboardSummaryStats = {
  todaySales: 0,
  todayProfit: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  topProducts: [],
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardSummaryStats>(defaultDashboardStats)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshDashboardStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await apiFetch<DashboardSummaryStats>('/api/reports/dashboard_summary.php')
      setStats({
        todaySales: data.todaySales ?? 0,
        todayProfit: data.todayProfit ?? 0,
        lowStockCount: data.lowStockCount ?? 0,
        outOfStockCount: data.outOfStockCount ?? 0,
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
