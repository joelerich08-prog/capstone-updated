'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useInventory } from '@/contexts/inventory-context'
import { useBatches } from '@/contexts/batch-context'
import { useProducts } from '@/contexts/products-context'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, Package, Bell, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { Alert, AlertPriority, AlertType } from '@/lib/types'

export function AlertsPanel() {
  const { inventoryLevels } = useInventory()
  const { getExpiringBatches, getExpiredBatches } = useBatches()
  const { products } = useProducts()

  const alerts = useMemo(() => {
    const alertList: Array<Alert & { priority: AlertPriority }> = []

    // Low stock alerts
    inventoryLevels.forEach(inv => {
      const product = products.find(p => p.id === inv.productId)
      const variant = product?.variants.find((v) => v.id === inv.variantId)
      const productLabel = variant ? `${product?.name || 'Product'} / ${variant.name}` : product?.name || 'Product'
      const totalStock = inv.wholesaleQty + inv.retailQty + inv.shelfQty
      const wholesaleStock = inv.wholesaleQty

      if (totalStock === 0) {
        alertList.push({
          id: `out-of-stock-${inv.id}`,
          type: 'out_of_stock',
          title: 'Out of Stock',
          message: `${productLabel} is out of stock`,
          priority: 'critical',
          createdAt: new Date(),
          productId: inv.productId,
          isRead: false,
        })
      } else {
        if (wholesaleStock <= (inv.wholesaleReorderLevel ?? 0) && wholesaleStock > 0) {
          alertList.push({
            id: `low-stock-${inv.id}`,
            type: 'low_stock',
            title: 'Low Wholesale Stock',
            message: `${productLabel} wholesale stock is low (${wholesaleStock} ${inv.wholesaleUnit} remaining)`,
            priority: 'high',
            createdAt: new Date(),
            productId: inv.productId,
            isRead: false,
          })
        }

        if ((inv.shelfQty ?? 0) <= (inv.shelfRestockLevel ?? 0) && (inv.shelfQty ?? 0) > 0) {
          alertList.push({
            id: `low-shelf-${inv.id}`,
            type: 'low_shelf',
            title: 'Low Shelf Stock',
            message: `${productLabel} shelf stock is low (${inv.shelfQty} ${inv.shelfUnit} remaining)`,
            priority: 'medium',
            createdAt: new Date(),
            productId: inv.productId,
            isRead: false,
          })
        }

        if ((inv.retailQty ?? 0) <= (inv.retailRestockLevel ?? 0) && (inv.retailQty ?? 0) > 0) {
          alertList.push({
            id: `low-retail-${inv.id}`,
            type: 'low_retail',
            title: 'Low Retail Stock',
            message: `${productLabel} retail stock is low (${inv.retailQty} ${inv.retailUnit} remaining)`,
            priority: 'medium',
            createdAt: new Date(),
            productId: inv.productId,
            isRead: false,
          })
        }
      }
    })

    // Expiring batches
    const expiringBatches = getExpiringBatches(30)
    expiringBatches.forEach(batch => {
      const product = products.find(p => p.id === batch.productId)
      alertList.push({
        id: `expiring-${batch.id}`,
        type: 'expiring',
        title: 'Product Expiring Soon',
        message: `${product?.name || 'Product'} batch expires ${formatDistanceToNow(batch.expirationDate, { addSuffix: true })}`,
        priority: 'medium',
        createdAt: new Date(),
        productId: batch.productId,
        isRead: false,
      })
    })

    // Expired batches
    const expiredBatches = getExpiredBatches()
    expiredBatches.forEach(batch => {
      const product = products.find(p => p.id === batch.productId)
      alertList.push({
        id: `expired-${batch.id}`,
        type: 'expired',
        title: 'Product Expired',
        message: `${product?.name || 'Product'} batch has expired`,
        priority: 'critical',
        createdAt: new Date(),
        productId: batch.productId,
        isRead: false,
      })
    })

    return alertList.slice(0, 5) // Show only top 5 alerts
  }, [inventoryLevels, products, getExpiringBatches, getExpiredBatches])

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
      case 'low_retail':
      case 'low_shelf':
        return Package
      default:
        return Bell
    }
  }

  const getPriorityColor = (priority: AlertPriority) => {
    switch (priority) {
      case 'critical':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'high':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 space-y-2 sm:space-y-0">
        <div className="flex items-start gap-2">
          <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
          <div className="min-w-0">
            <CardTitle className="text-base">Active Alerts</CardTitle>
            <CardDescription className="text-xs">
              Items requiring attention
            </CardDescription>
          </div>
        </div>
        <Badge variant="destructive" className="text-xs shrink-0 h-fit">
          {alerts.length} active
        </Badge>
      </CardHeader>
      <CardContent>
        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.slice(0, 4).map((alert) => {
              const Icon = getAlertIcon(alert.type)
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${getPriorityColor(alert.priority)}`}
                >
                  <Icon className="size-4 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs opacity-80">{alert.message}</p>
                    <p className="text-xs opacity-60">
                      {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex h-[188px] items-center justify-center text-center text-sm text-muted-foreground">
            No active alerts at the moment.
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full mt-4" asChild>
          <Link href="/admin/analytics/alerts">
            View all alerts
            <ChevronRight className="size-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
