'use client'

import { StockmanShell } from '@/components/layout/stockman-shell'
import { ReceiveStockPanel } from '@/components/shared/receive-stock-panel'

export default function ReceiveStockPage() {
  return (
    <StockmanShell
      title="Receive Stock"
      description="Record incoming inventory from suppliers"
    >
      <ReceiveStockPanel />
    </StockmanShell>
  )
}
