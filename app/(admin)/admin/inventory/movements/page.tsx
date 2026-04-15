'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { InventoryOperationsTabs } from '@/components/shared/inventory-operations-tabs'

export default function MovementsPage() {
  return (
    <DashboardShell
      title="Inventory Operations"
      description="Manage receiving, breakdowns, transfers, adjustments, and movement history"
      allowedRoles={['admin', 'stockman']}
    >
      <InventoryOperationsTabs scope="admin" />
    </DashboardShell>
  )
}