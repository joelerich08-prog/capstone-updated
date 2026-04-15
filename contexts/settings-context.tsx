'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { apiFetch, isApiErrorWithStatus } from '@/lib/api-client'

const SETTINGS_STORAGE_KEY = 'capstone.settings.local'

// ============ TYPES ============

export interface StoreSettings {
  name: string
  address: string
  city: string
  postalCode: string
  phone: string
  email: string
  taxId: string
  currency: string
  timezone: string
  businessHours: {
    open: string
    close: string
  }
}

export interface NotificationSettings {
  lowStockAlerts: boolean
  expiryAlerts: boolean
  dailyReports: boolean
  weeklyReports: boolean
  lowStockThreshold: number
  expiryWarningDays: number
}

export interface POSSettings {
  quickAddMode: boolean
  showProductImages: boolean
  autoPrintReceipt: boolean
  requireCustomerInfo: boolean
  enableCashPayment: boolean
  enableGCashPayment: boolean
  enableMayaPayment: boolean
  enableCardPayment: boolean
}

export interface SecuritySettings {
  twoFactorEnabled: boolean
  sessionTimeout: number // minutes
  maxLoginAttempts: number
  autoBackup: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
  dataRetentionDays: number
}

export interface PrinterDevice {
  id: string
  name: string
  type: 'receipt' | 'label' | 'report'
  connectionType: 'usb' | 'network' | 'bluetooth'
  ipAddress?: string
  port?: number
  isDefault: boolean
  status: 'online' | 'offline' | 'error'
  paperSize: string
  lastUsed?: Date
}

export interface PrintSettings {
  autoPrintReceipts: boolean
  printCustomerCopy: boolean
  includeLogo: boolean
  includeBarcode: boolean
  footerMessage: string
  fontSize: 'small' | 'medium' | 'large'
}

export type UserRole = 'admin' | 'manager' | 'cashier' | 'stockman'

export interface ModulePermission {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

export interface RolePermissions {
  dashboard: ModulePermission
  pos: ModulePermission
  inventory: ModulePermission
  products: ModulePermission
  suppliers: ModulePermission
  reports: ModulePermission
  users: ModulePermission
  settings: ModulePermission
}

export type AccessPermissions = Record<UserRole, RolePermissions>

export interface AppSettings {
  store: StoreSettings
  notifications: NotificationSettings
  pos: POSSettings
  security: SecuritySettings
  printers: PrinterDevice[]
  printSettings: PrintSettings
  permissions: AccessPermissions
}

// ============ DEFAULT VALUES ============

const defaultStoreSettings: StoreSettings = {
  name: 'Sari-Sari Store',
  address: '123 Main Street, Barangay Centro',
  city: 'Manila',
  postalCode: '1000',
  phone: '+63 912 345 6789',
  email: 'store@example.com',
  taxId: '123-456-789-000',
  currency: 'PHP',
  timezone: 'Asia/Manila',
  businessHours: {
    open: '06:00',
    close: '22:00',
  },
}

const defaultNotificationSettings: NotificationSettings = {
  lowStockAlerts: true,
  expiryAlerts: true,
  dailyReports: false,
  weeklyReports: true,
  lowStockThreshold: 10,
  expiryWarningDays: 30,
}

const defaultPOSSettings: POSSettings = {
  quickAddMode: true,
  showProductImages: true,
  autoPrintReceipt: false,
  requireCustomerInfo: false,
  enableCashPayment: true,
  enableGCashPayment: true,
  enableMayaPayment: true,
  enableCardPayment: false,
}

const defaultSecuritySettings: SecuritySettings = {
  twoFactorEnabled: false,
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  autoBackup: true,
  backupFrequency: 'daily',
  dataRetentionDays: 365,
}

const defaultPrintSettings: PrintSettings = {
  autoPrintReceipts: false,
  printCustomerCopy: false,
  includeLogo: true,
  includeBarcode: true,
  footerMessage: 'Thank you for shopping with us!',
  fontSize: 'medium',
}

const defaultModulePermission: ModulePermission = {
  view: false,
  create: false,
  edit: false,
  delete: false,
}

const fullAccess: ModulePermission = {
  view: true,
  create: true,
  edit: true,
  delete: true,
}

const viewOnly: ModulePermission = {
  view: true,
  create: false,
  edit: false,
  delete: false,
}

const viewCreate: ModulePermission = {
  view: true,
  create: true,
  edit: false,
  delete: false,
}

const viewCreateEdit: ModulePermission = {
  view: true,
  create: true,
  edit: true,
  delete: false,
}

const defaultPermissions: AccessPermissions = {
  admin: {
    dashboard: fullAccess,
    pos: fullAccess,
    inventory: fullAccess,
    products: fullAccess,
    suppliers: fullAccess,
    reports: fullAccess,
    users: fullAccess,
    settings: fullAccess,
  },
  manager: {
    dashboard: fullAccess,
    pos: fullAccess,
    inventory: viewCreateEdit,
    products: viewCreateEdit,
    suppliers: viewCreateEdit,
    reports: fullAccess,
    users: viewOnly,
    settings: viewOnly,
  },
  cashier: {
    dashboard: viewOnly,
    pos: fullAccess,
    inventory: viewOnly,
    products: viewOnly,
    suppliers: defaultModulePermission,
    reports: viewOnly,
    users: defaultModulePermission,
    settings: defaultModulePermission,
  },
  stockman: {
    dashboard: viewOnly,
    pos: defaultModulePermission,
    inventory: viewCreateEdit,
    products: viewCreate,
    suppliers: viewOnly,
    reports: viewOnly,
    users: defaultModulePermission,
    settings: defaultModulePermission,
  },
}

const defaultPrinters: PrinterDevice[] = [
  {
    id: 'printer_001',
    name: 'Main Receipt Printer',
    type: 'receipt',
    connectionType: 'usb',
    isDefault: true,
    status: 'online',
    paperSize: '80mm',
    lastUsed: new Date(),
  },
]

const defaultSettings: AppSettings = {
  store: defaultStoreSettings,
  notifications: defaultNotificationSettings,
  pos: defaultPOSSettings,
  security: defaultSecuritySettings,
  printers: defaultPrinters,
  printSettings: defaultPrintSettings,
  permissions: defaultPermissions,
}

function readStoredSettings(): Partial<AppSettings> | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      ...parsed,
      printers: parsed.printers?.map(printer => ({
        ...printer,
        lastUsed: printer.lastUsed ? new Date(printer.lastUsed) : undefined,
      })),
    }
  } catch (error) {
    console.error('Failed to read local settings cache:', error)
    return null
  }
}

function writeStoredSettings(nextSettings: AppSettings) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings))
  } catch (error) {
    console.error('Failed to write local settings cache:', error)
  }
}

// ============ CONTEXT ============

interface SettingsContextType {
  settings: AppSettings
  isLoaded: boolean
  
  // Store settings
  updateStoreSettings: (updates: Partial<StoreSettings>) => void
  
  // Notification settings
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void
  
  // POS settings
  updatePOSSettings: (updates: Partial<POSSettings>) => void
  
  // Security settings
  updateSecuritySettings: (updates: Partial<SecuritySettings>) => void
  
  // Print settings
  updatePrintSettings: (updates: Partial<PrintSettings>) => void
  
  // Printer management
  addPrinter: (printer: Omit<PrinterDevice, 'id'>) => void
  updatePrinter: (id: string, updates: Partial<PrinterDevice>) => void
  removePrinter: (id: string) => void
  setDefaultPrinter: (id: string) => void
  refreshPrinterStatus: (id: string) => Promise<void>
  
  // Permission management
  togglePermission: (role: UserRole, module: keyof RolePermissions, action: keyof ModulePermission) => void
  toggleAllModulePermissions: (role: UserRole, module: keyof RolePermissions, enabled: boolean) => void
  resetPermissionsToDefaults: () => void
  
  // Save/Reset
  updateSettings: (updates: Partial<AppSettings>) => Promise<boolean>
  saveSettings: () => Promise<boolean>
  resetToDefaults: () => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { user, permissions: authPermissions, isLoading: isAuthLoading } = useAuth()

  // fetch settings from API on mount
  useEffect(() => {
    const storedSettings = readStoredSettings()
    if (storedSettings) {
      setSettings(prev => ({
        ...prev,
        ...storedSettings,
        store: storedSettings.store ? { ...prev.store, ...storedSettings.store } : prev.store,
        notifications: storedSettings.notifications ? { ...prev.notifications, ...storedSettings.notifications } : prev.notifications,
        pos: storedSettings.pos ? { ...prev.pos, ...storedSettings.pos } : prev.pos,
        security: storedSettings.security ? { ...prev.security, ...storedSettings.security } : prev.security,
        printSettings: storedSettings.printSettings ? { ...prev.printSettings, ...storedSettings.printSettings } : prev.printSettings,
        permissions: storedSettings.permissions ? { ...prev.permissions, ...storedSettings.permissions } : prev.permissions,
        printers: storedSettings.printers ?? prev.printers,
      }))
    }

    if (isAuthLoading) {
      return
    }

    if (!user) {
      setSettings(defaultSettings)
      setIsLoaded(true)
      return
    }

    const fetchSettings = async () => {
      try {
        const apiSettings = await apiFetch<Partial<AppSettings>>('/api/settings/get_config.php')
        const stored = readStoredSettings()

        // API remains the source of truth for store, POS, and printer data.
        // Locally cached settings fill in admin-only preferences not yet persisted by the backend.
        const mergedSettings: AppSettings = {
          ...defaultSettings,
          ...stored,
          ...apiSettings,
          store: { ...defaultSettings.store, ...stored?.store, ...apiSettings.store },
          notifications: { ...defaultSettings.notifications, ...stored?.notifications, ...apiSettings.notifications },
          pos: { ...defaultSettings.pos, ...stored?.pos, ...apiSettings.pos },
          security: { ...defaultSettings.security, ...stored?.security, ...apiSettings.security },
          printSettings: { ...defaultSettings.printSettings, ...stored?.printSettings, ...apiSettings.printSettings },
          permissions: { ...defaultSettings.permissions, ...stored?.permissions, ...apiSettings.permissions },
          printers: apiSettings.printers || stored?.printers || defaultPrinters,
        }

        setSettings(mergedSettings)
        writeStoredSettings(mergedSettings)
      } catch (error) {
        if (isApiErrorWithStatus(error, 401)) {
          setSettings(defaultSettings)
          return
        }
        console.error('Failed to load settings:', error)
      } finally {
        setIsLoaded(true)
      }
    }

    fetchSettings()
  }, [user, isAuthLoading])

  useEffect(() => {
    if (user && authPermissions) {
      setSettings(prev => {
        const nextSettings = {
          ...prev,
          permissions: {
            ...prev.permissions,
            [user.role]: authPermissions,
          },
        }
        writeStoredSettings(nextSettings)
        return nextSettings
      })
    }
  }, [user, authPermissions])

  // Save to API
  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const nextSettings: AppSettings = {
      ...settings,
      ...updates,
      store: updates.store ? { ...settings.store, ...updates.store } : settings.store,
      notifications: updates.notifications ? { ...settings.notifications, ...updates.notifications } : settings.notifications,
      pos: updates.pos ? { ...settings.pos, ...updates.pos } : settings.pos,
      security: updates.security ? { ...settings.security, ...updates.security } : settings.security,
      printSettings: updates.printSettings ? { ...settings.printSettings, ...updates.printSettings } : settings.printSettings,
      printers: updates.printers ?? settings.printers,
      permissions: updates.permissions ? { ...settings.permissions, ...updates.permissions } : settings.permissions,
    }

    setSettings(nextSettings)
    writeStoredSettings(nextSettings)

    const payload: Record<string, unknown> = {}
    if (updates.store) payload.store = nextSettings.store
    if (updates.pos) payload.pos = nextSettings.pos
    if (updates.printers) payload.printers = nextSettings.printers

    if (Object.keys(payload).length === 0) {
      return true
    }

    try {
      setIsSaving(true)
      await apiFetch('/api/settings/update_settings.php', {
        method: 'POST',
        body: payload,
      })

      console.log('Settings saved successfully')
      return true
    } catch (error) {
      console.error('Error saving settings:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [settings])

  const saveSettings = useCallback(async () => {
    return updateSettings({
      store: settings.store,
      pos: settings.pos,
      printers: settings.printers,
    })
  }, [settings.store, settings.pos, settings.printers, updateSettings])

  // Update functions
  const updateStoreSettings = useCallback((updates: Partial<StoreSettings>) => {
    setSettings(prev => ({
      ...prev,
      store: { ...prev.store, ...updates },
    }))
  }, [])

  const updateNotificationSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, ...updates },
    }))
  }, [])

  const updatePOSSettings = useCallback((updates: Partial<POSSettings>) => {
    setSettings(prev => ({
      ...prev,
      pos: { ...prev.pos, ...updates },
    }))
  }, [])

  const updateSecuritySettings = useCallback((updates: Partial<SecuritySettings>) => {
    setSettings(prev => ({
      ...prev,
      security: { ...prev.security, ...updates },
    }))
  }, [])

  const updatePrintSettings = useCallback((updates: Partial<PrintSettings>) => {
    setSettings(prev => ({
      ...prev,
      printSettings: { ...prev.printSettings, ...updates },
    }))
  }, [])

  // Printer management
  const addPrinter = useCallback((printer: Omit<PrinterDevice, 'id'>) => {
    const newPrinter: PrinterDevice = {
      ...printer,
      id: `printer_${Date.now()}`,
    }
    setSettings(prev => ({
      ...prev,
      printers: [...prev.printers, newPrinter],
    }))
  }, [])

  const updatePrinter = useCallback((id: string, updates: Partial<PrinterDevice>) => {
    setSettings(prev => ({
      ...prev,
      printers: prev.printers.map(p => 
        p.id === id ? { ...p, ...updates } : p
      ),
    }))
  }, [])

  const removePrinter = useCallback((id: string) => {
    setSettings(prev => ({
      ...prev,
      printers: prev.printers.filter(p => p.id !== id),
    }))
  }, [])

  const setDefaultPrinter = useCallback((id: string) => {
    setSettings(prev => ({
      ...prev,
      printers: prev.printers.map(p => ({
        ...p,
        isDefault: p.id === id,
      })),
    }))
  }, [])

  const refreshPrinterStatus = useCallback(async (id: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000))

    setSettings(prev => {
      const nextSettings = {
        ...prev,
        printers: prev.printers.map(printer => {
          if (printer.id !== id) {
            return printer
          }

          let status: PrinterDevice['status'] = 'online'
          if (printer.connectionType === 'network') {
            if (!printer.ipAddress) {
              status = 'offline'
            } else if (!printer.port || printer.port <= 0) {
              status = 'error'
            }
          }

          return { ...printer, status }
        }),
      }
      writeStoredSettings(nextSettings)
      return nextSettings
    })
  }, [])

  // Permission management
  const togglePermission = useCallback((
    role: UserRole,
    module: keyof RolePermissions,
    action: keyof ModulePermission
  ) => {
    // Don't allow modifying admin permissions
    if (role === 'admin') return
    
    setSettings(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [role]: {
          ...prev.permissions[role],
          [module]: {
            ...prev.permissions[role][module],
            [action]: !prev.permissions[role][module][action],
          },
        },
      },
    }))
  }, [])

  const toggleAllModulePermissions = useCallback((
    role: UserRole,
    module: keyof RolePermissions,
    enabled: boolean
  ) => {
    // Don't allow modifying admin permissions
    if (role === 'admin') return
    
    setSettings(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [role]: {
          ...prev.permissions[role],
          [module]: {
            view: enabled,
            create: enabled,
            edit: enabled,
            delete: enabled,
          },
        },
      },
    }))
  }, [])

  const resetPermissionsToDefaults = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      permissions: defaultPermissions,
    }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setSettings(defaultSettings)
    writeStoredSettings(defaultSettings)
  }, [])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoaded,
        updateStoreSettings,
        updateNotificationSettings,
        updatePOSSettings,
        updateSecuritySettings,
        updatePrintSettings,
        addPrinter,
        updatePrinter,
        removePrinter,
        setDefaultPrinter,
        refreshPrinterStatus,
        togglePermission,
        toggleAllModulePermissions,
        resetPermissionsToDefaults,
        updateSettings,
        saveSettings,
        resetToDefaults,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

// Export defaults for use elsewhere
export { defaultPermissions, defaultSettings }
