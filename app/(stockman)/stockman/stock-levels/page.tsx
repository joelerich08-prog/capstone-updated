'use client'

import { StockmanShell } from '@/components/layout/stockman-shell'
import { StockLevelsOverview } from '@/components/shared/stock-levels-overview'

export default function StockmanStockLevelsPage() {
  return (
    <StockmanShell
      title="Stock Levels"
      description="Three-tier inventory overview"
    >
      <StockLevelsOverview
        breakdownHref="/stockman/breakdown"
        transferHref="/stockman/transfer"
        showPackaging
      />
    </StockmanShell>
  )
}
