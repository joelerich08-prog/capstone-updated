'use client'

import { useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowRightLeft, ClipboardEdit, PackagePlus, Scissors, Waypoints } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReceiveStockPanel } from '@/components/shared/receive-stock-panel'
import { StockBreakdownPanel } from '@/components/shared/stock-breakdown-panel'
import { StockTransferPanel } from '@/components/shared/stock-transfer-panel'
import { StockAdjustmentPanel } from '@/components/shared/stock-adjustments-panel'
import { StockMovementHistory } from '@/components/shared/stock-movement-history'

type InventoryTab = 'receive' | 'breakdown' | 'transfer' | 'adjustments' | 'movements'
type InventoryScope = 'admin' | 'stockman'

const tabMeta: Record<
  InventoryTab,
  {
    label: string
    description: string
    icon: typeof PackagePlus
  }
> = {
  receive: {
    label: 'Receive Stock',
    description: 'Record incoming inventory from suppliers with batch tracking.',
    icon: PackagePlus,
  },
  breakdown: {
    label: 'Breakdown',
    description: 'Convert wholesale boxes into retail packs.',
    icon: Scissors,
  },
  transfer: {
    label: 'Transfer',
    description: 'Move stock from retail storage to shelf display.',
    icon: ArrowRightLeft,
  },
  adjustments: {
    label: 'Adjustments',
    description: 'Apply stock corrections, damages, expiry, and manual updates.',
    icon: ClipboardEdit,
  },
  movements: {
    label: 'Movements',
    description: 'Review the full movement history for all inventory changes.',
    icon: Waypoints,
  },
}

const routeMap: Record<InventoryScope, Record<InventoryTab, string>> = {
  admin: {
    receive: '/admin/inventory/receive',
    breakdown: '/admin/inventory/breakdown',
    transfer: '/admin/inventory/transfer',
    adjustments: '/admin/inventory/adjustments',
    movements: '/admin/inventory/movements',
  },
  stockman: {
    receive: '/stockman/receiving',
    breakdown: '/stockman/breakdown',
    transfer: '/stockman/transfer',
    adjustments: '/stockman/adjustments',
    movements: '/stockman/movements',
  },
}

export function InventoryOperationsTabs({ scope }: { scope: InventoryScope }) {
  const pathname = usePathname()
  const router = useRouter()

  const activeTab = useMemo<InventoryTab>(() => {
    if (pathname.endsWith('/receive') || pathname.endsWith('/receiving')) return 'receive'
    if (pathname.endsWith('/breakdown')) return 'breakdown'
    if (pathname.endsWith('/transfer')) return 'transfer'
    if (pathname.endsWith('/adjustments')) return 'adjustments'
    if (pathname.endsWith('/movements')) return 'movements'
    return 'receive'
  }, [pathname])

  const ActiveIcon = tabMeta[activeTab].icon

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => router.push(routeMap[scope][value as InventoryTab])}
      className="gap-6"
    >
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Inventory Operations</CardTitle>
              <CardDescription>
                Receive, break down, transfer, adjust, and audit stock from one workspace.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ActiveIcon className="size-4" />
              <span>{tabMeta[activeTab].description}</span>
            </div>
          </div>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-5">
            <TabsTrigger value="receive" className="h-10 border bg-muted/60">
              <PackagePlus className="size-4" />
              Receive
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="h-10 border bg-muted/60">
              <Scissors className="size-4" />
              Breakdown
            </TabsTrigger>
            <TabsTrigger value="transfer" className="h-10 border bg-muted/60">
              <ArrowRightLeft className="size-4" />
              Transfer
            </TabsTrigger>
            <TabsTrigger value="adjustments" className="h-10 border bg-muted/60">
              <ClipboardEdit className="size-4" />
              Adjustments
            </TabsTrigger>
            <TabsTrigger value="movements" className="h-10 border bg-muted/60">
              <Waypoints className="size-4" />
              Movements
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="pt-0">
          <TabsContent value="receive">
            <ReceiveStockPanel />
          </TabsContent>
          <TabsContent value="breakdown">
            <StockBreakdownPanel />
          </TabsContent>
          <TabsContent value="transfer">
            <StockTransferPanel />
          </TabsContent>
          <TabsContent value="adjustments">
            <StockAdjustmentPanel />
          </TabsContent>
          <TabsContent value="movements">
            <StockMovementHistory />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  )
}
