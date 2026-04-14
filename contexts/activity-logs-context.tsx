'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { UserRole } from '@/lib/types'
import { apiFetch } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'

// Activity Log Entry type
export interface ActivityLogEntry {
  id: string
  userId: string
  userName: string
  userRole: UserRole
  action: string
  module: string
  details: string
  ipAddress: string
  timestamp: Date
}

interface ActivityLogsContextType {
  logs: ActivityLogEntry[]
  isLoading: boolean
  refreshLogs: () => Promise<void>
  getLogsByUser: (userId: string) => ActivityLogEntry[]
  getLogsByModule: (module: string) => ActivityLogEntry[]
  getLogsByAction: (action: string) => ActivityLogEntry[]
}

const ActivityLogsContext = createContext<ActivityLogsContextType | undefined>(undefined)

export function ActivityLogsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const canLoadLogs = isAuthenticated && user?.role === 'admin'

  // Fetch activity logs from API on mount
  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (!canLoadLogs) {
      setLogs([])
      setIsLoading(false)
      return
    }

    const fetchLogs = async () => {
      try {
        setIsLoading(true)
        const data = await apiFetch<ActivityLogEntry[]>('/api/activity-logs/get_all.php')
        const logsWithDates = (data as any[]).map(log => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }))
        setLogs(logsWithDates)
      } catch (error) {
        console.error('Failed to load activity logs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [canLoadLogs, isAuthLoading])

  const refreshLogs = useCallback(async () => {
    if (!canLoadLogs) {
      setLogs([])
      return
    }

    try {
      const data = await apiFetch<ActivityLogEntry[]>('/api/activity-logs/get_all.php')
      const logsWithDates = (data as any[]).map(log => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }))
      setLogs(logsWithDates)
    } catch (error) {
      console.error('Failed to refresh activity logs:', error)
    }
  }, [canLoadLogs])

  const getLogsByUser = useCallback((userId: string): ActivityLogEntry[] => {
    return logs.filter(log => log.userId === userId)
  }, [logs])

  const getLogsByModule = useCallback((module: string): ActivityLogEntry[] => {
    return logs.filter(log => log.module === module)
  }, [logs])

  const getLogsByAction = useCallback((action: string): ActivityLogEntry[] => {
    return logs.filter(log => log.action === action)
  }, [logs])

  const value: ActivityLogsContextType = {
    logs,
    isLoading,
    refreshLogs,
    getLogsByUser,
    getLogsByModule,
    getLogsByAction,
  }

  return (
    <ActivityLogsContext.Provider value={value}>
      {children}
    </ActivityLogsContext.Provider>
  )
}

export function useActivityLogs() {
  const context = useContext(ActivityLogsContext)
  if (context === undefined) {
    throw new Error('useActivityLogs must be used within an ActivityLogsProvider')
  }
  return context
}
