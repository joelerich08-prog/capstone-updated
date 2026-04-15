'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { ReceiveStockPanel } from '@/components/shared/receive-stock-panel'

export default function ReceiveStockPage() {
  return (
    <DashboardShell
      title="Receive Stock"
      description="Record incoming inventory from suppliers with batch tracking"
      allowedRoles={['admin', 'stockman']}
    >
      <ReceiveStockPanel />
    </DashboardShell>
  )
}
