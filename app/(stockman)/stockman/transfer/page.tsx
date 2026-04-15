'use client'

import { StockmanShell } from '@/components/layout/stockman-shell'
import { StockTransferPanel } from '@/components/shared/stock-transfer-panel'

export default function TransferPage() {
  return (
    <StockmanShell
      title="Stock Transfer"
      description="Transfer stock from retail storage to store shelf"
    >
      <StockTransferPanel />
    </StockmanShell>
  )
}
