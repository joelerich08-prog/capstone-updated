'use client'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { StockLevelsOverview } from '@/components/shared/stock-levels-overview'

export default function StockLevelsPage() {
  return (
    <DashboardShell
      title="Stock Levels"
      description="Three-tier inventory overview"
      allowedRoles={['admin']}
    >
      <StockLevelsOverview
        breakdownHref="/admin/inventory/breakdown"
        transferHref="/admin/inventory/transfer"
        showActions
        productHrefPrefix="/admin/inventory"
      />
    </DashboardShell>
  )
}
