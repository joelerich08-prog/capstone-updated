'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, UserRole } from '@/lib/types'
import { apiFetch } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'

// Extended User type for management with status and phone
export interface ExtendedUser extends Omit<User, 'password'> {
  phone?: string
  status: 'active' | 'inactive'
}

interface UsersContextType {
  users: ExtendedUser[]
  isLoading: boolean
  setUsers: React.Dispatch<React.SetStateAction<ExtendedUser[]>>
  refreshUsers: () => Promise<void>
  getUserById: (id: string) => ExtendedUser | undefined
  getUsersByRole: (role: UserRole) => ExtendedUser[]
}

const UsersContext = createContext<UsersContextType | undefined>(undefined)

export function UsersProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [users, setUsers] = useState<ExtendedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const canLoadUsers = isAuthenticated && user?.role === 'admin'

  // Fetch users from API on mount
  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (!canLoadUsers) {
      setUsers([])
      setIsLoading(false)
      return
    }

    const fetchUsers = async () => {
      try {
        setIsLoading(true)
        const data = await apiFetch<ExtendedUser[]>('/api/users/get_all.php')
        const usersWithDates = (data as any[]).map(user => ({
          ...user,
          createdAt: new Date(user.createdAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
        }))
        setUsers(usersWithDates)
      } catch (error) {
        console.error('Failed to load users:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [canLoadUsers, isAuthLoading])

  const refreshUsers = useCallback(async () => {
    if (!canLoadUsers) {
      setUsers([])
      return
    }

    try {
      const data = await apiFetch<ExtendedUser[]>('/api/users/get_all.php')
      const usersWithDates = (data as any[]).map(user => ({
        ...user,
        createdAt: new Date(user.createdAt),
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
      }))
      setUsers(usersWithDates)
    } catch (error) {
      console.error('Failed to refresh users:', error)
    }
  }, [canLoadUsers])

  const getUserById = useCallback((id: string): ExtendedUser | undefined => {
    return users.find(u => u.id === id)
  }, [users])

  const getUsersByRole = useCallback((role: UserRole): ExtendedUser[] => {
    return users.filter(u => u.role === role)
  }, [users])

  const value: UsersContextType = {
    users,
    isLoading,
    setUsers,
    refreshUsers,
    getUserById,
    getUsersByRole,
  }

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  )
}

export function useUsers() {
  const context = useContext(UsersContext)
  if (context === undefined) {
    throw new Error('useUsers must be used within a UsersProvider')
  }
  return context
}
