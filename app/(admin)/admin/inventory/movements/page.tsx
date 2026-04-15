'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { StockMovementHistory } from '@/components/shared/stock-movement-history'

export default function MovementsPage() {
  return (
    <DashboardShell
      title="Stock Movements"
      description="Track all inventory changes and movements"
      allowedRoles={['admin', 'stockman']}
    >
      <StockMovementHistory />
    </DashboardShell>
  )
}
