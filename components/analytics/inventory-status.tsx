'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useInventory } from '@/contexts/inventory-context'
import { useProducts } from '@/contexts/products-context'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'

export function InventoryStatus() {
  const { inventoryLevels } = useInventory()
  const { products } = useProducts()
  
  // Get top 8 products by total stock for the chart
  const data = useMemo(() => {
    return inventoryLevels
      .map((inv) => {
        const product = products.find((p) => p.id === inv.productId)
        return {
          name: product?.name.slice(0, 12) || 'Unknown',
          wholesale: inv.wholesaleQty,
          retail: inv.retailQty,
          shelf: inv.shelfQty,
          total: inv.wholesaleQty + inv.retailQty + inv.shelfQty,
        }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [inventoryLevels])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Three-Tier Inventory</CardTitle>
        <CardDescription>Stock levels across warehouse, retail, and shelf</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-[300px] w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%" minWidth={400}>
              <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  width={60}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md">
                        <p className="text-sm font-medium mb-2">{data.name}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Wholesale:</span>
                            <span className="font-medium">{data.wholesale}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Retail:</span>
                            <span className="font-medium">{data.retail}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Shelf:</span>
                            <span className="font-medium">{data.shelf}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground capitalize">{value}</span>
                  )}
                />
                <Bar dataKey="wholesale" stackId="stock" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="retail" stackId="stock" fill="hsl(var(--chart-2))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="shelf" stackId="stock" fill="hsl(var(--chart-3))" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-center text-sm text-muted-foreground">
            Inventory data will appear here once stock levels are available.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
