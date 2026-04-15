'use client'

import { StockmanShell } from '@/components/layout/stockman-shell'
import { StockMovementHistory } from '@/components/shared/stock-movement-history'

export default function StockmanMovementsPage() {
  return (
    <StockmanShell title="Stock Movements" description="Track all inventory changes and movements">
      <StockMovementHistory />
    </StockmanShell>
  )
}
