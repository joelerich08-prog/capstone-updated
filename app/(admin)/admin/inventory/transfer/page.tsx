'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { StockTransferPanel } from '@/components/shared/stock-transfer-panel'

export default function TransferPage() {
  return (
    <DashboardShell
      title="Stock Transfer"
      description="Transfer stock from retail storage to store shelf"
      allowedRoles={['admin', 'stockman']}
    >
      <StockTransferPanel />
    </DashboardShell>
  )
}
