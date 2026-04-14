'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { User, UserRole, RolePermissions } from '@/lib/types'
import { apiFetch } from '@/lib/api-client'
import { getDefaultPath } from '@/lib/utils/permissions'

const AUTH_SESSION_KEY = 'capstone.auth.session'

interface RegisterUserData {
  email: string
  password: string
  name: string
  role?: UserRole
  phone?: string
}

interface AuthContextType {
  user: User | null
  permissions: RolePermissions | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterUserData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  checkAuth: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<RolePermissions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasMounted, setHasMounted] = useState(false)
  const router = useRouter()

  // Verify session on mount
  type AuthResponse = Omit<User, 'createdAt' | 'lastLogin'> & {
    createdAt: string
    lastLogin?: string | null
    permissions: RolePermissions
  }

  const hasAuthSessionMarker = () =>
    typeof window !== 'undefined' && window.localStorage.getItem(AUTH_SESSION_KEY) === '1'

  const setAuthSessionMarker = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_SESSION_KEY, '1')
    }
  }

  const clearAuthSessionMarker = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_SESSION_KEY)
    }
  }

  useEffect(() => {
    const verifySession = async () => {
      if (!hasAuthSessionMarker()) {
        setUser(null)
        setPermissions(null)
        setIsLoading(false)
        setHasMounted(true)
        return
      }

      try {
        const data = await apiFetch<AuthResponse>('/api/auth/me.php')
        const userData: User = {
          ...data,
          createdAt: new Date(data.createdAt),
          lastLogin: data.lastLogin ? new Date(data.lastLogin) : undefined,
        }

        setUser(userData)
        setPermissions(data.permissions)
      } catch (error) {
        clearAuthSessionMarker()
        setUser(null)
        setPermissions(null)
      } finally {
        setIsLoading(false)
        setHasMounted(true)
      }
    }

    verifySession()
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true)
      try {
        const data = await apiFetch<AuthResponse>('/api/auth/login.php', {
          method: 'POST',
          body: { email, password },
        })
        const userData: User = {
          ...data,
          createdAt: new Date(data.createdAt),
          lastLogin: data.lastLogin ? new Date(data.lastLogin) : undefined,
        }

        setUser(userData)
        setPermissions(data.permissions)
        setAuthSessionMarker()

        const redirectPath = getDefaultPath(userData.role)
        router.push(redirectPath)

        setIsLoading(false)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Network error occurred'
        setIsLoading(false)
        return { success: false, error: message }
      }
    },
    [router]
  )

  const register = useCallback(
    async (data: RegisterUserData) => {
      setIsLoading(true)
      try {
        const responseData = await apiFetch<AuthResponse>('/api/auth/register.php', {
          method: 'POST',
          body: { role: 'customer', ...data } as Record<string, unknown>,
        })
        const userData: User = {
          ...responseData,
          createdAt: new Date(responseData.createdAt),
          lastLogin: responseData.lastLogin ? new Date(responseData.lastLogin) : undefined,
        }

        setUser(userData)
        setPermissions(responseData.permissions)
        setAuthSessionMarker()

        router.push('/shop')

        setIsLoading(false)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Network error occurred'
        setIsLoading(false)
        return { success: false, error: message }
      }
    },
    [router]
  )

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout.php', { method: 'POST' })
    } catch (error) {
      console.error('Logout request failed:', error)
    }

    clearAuthSessionMarker()
    setUser(null)
    setPermissions(null)

    const currentRole = user?.role
    if (currentRole && currentRole !== 'customer') {
      router.push('/admin/login')
    } else {
      router.push('/login')
    }
  }, [router, user?.role])

  const checkAuth = useCallback(() => {
    return !!user
  }, [user])

  if (!hasMounted) {
    return null
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook to require authentication
export function useRequireAuth(allowedRoles?: UserRole[], isStaffArea?: boolean) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to appropriate login page
      router.push(isStaffArea ? '/admin/login' : '/login')
    } else if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      // User is authenticated but doesn't have the required role
      router.push(getDefaultPath(user.role))
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router, isStaffArea])

  return { user, isLoading, isAuthenticated }
}
