'use client'

import { StockmanShell } from '@/components/layout/stockman-shell'
import { StockAdjustmentPanel } from '@/components/shared/stock-adjustments-panel'

export default function StockmanAdjustmentsPage() {
  return (
    <StockmanShell
      title="Stock Adjustments"
      description="Record inventory adjustments for damages, expiry, or corrections"
    >
      <StockAdjustmentPanel />
    </StockmanShell>
  )
}
