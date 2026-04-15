'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { StockAdjustmentPanel } from '@/components/shared/stock-adjustments-panel'

export default function AdjustmentsPage() {
  return (
    <DashboardShell
      title="Stock Adjustments"
      description="Record inventory adjustments for damages, expiry, or corrections"
      allowedRoles={['admin', 'stockman']}
    >
      <StockAdjustmentPanel />
    </DashboardShell>
  )
}
