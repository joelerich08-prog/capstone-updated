'use client'

import { StockmanShell } from '@/components/layout/stockman-shell'
import { InventoryOperationsTabs } from '@/components/shared/inventory-operations-tabs'

export default function ReceiveStockPage() {
  return (
    <StockmanShell
      title="Inventory Operations"
      description="Manage receiving, breakdowns, transfers, adjustments, and movement history"
    >
      <InventoryOperationsTabs scope="stockman" />
    </StockmanShell>
  )
}