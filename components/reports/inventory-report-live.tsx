"use client"

import { useEffect, useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { endOfDay, startOfDay, subDays } from "date-fns"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useProducts } from "@/contexts/products-context"
import { useInventory } from "@/contexts/inventory-context"
import { apiFetch } from "@/lib/api-client"
import type { StockMovement } from "@/lib/types"

interface InventoryReportLiveProps {
  dateRange: DateRange | undefined
}

export function InventoryReportLive({ dateRange }: InventoryReportLiveProps) {
  const { products, categories } = useProducts()
  const { inventoryLevels } = useInventory()
  const [movements, setMovements] = useState<StockMovement[]>([])

  const effectiveRange = useMemo(() => {
    const to = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(new Date())
    const from = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(subDays(to, 29))
    return { from, to }
  }, [dateRange])

  useEffect(() => {
    let isMounted = true
    const loadMovements = async () => {
      try {
        const data = await apiFetch<StockMovement[]>("/api/inventory/get_movements.php")
        if (!isMounted) return
        setMovements(data.map(movement => ({ ...movement, createdAt: new Date(movement.createdAt) })))
      } catch (error) {
        if (!isMounted) return
        console.error("Failed to load report movements:", error)
        setMovements([])
      }
    }
    void loadMovements()
    return () => {
      isMounted = false
    }
  }, [])

  const inventoryByProduct = useMemo(() => new Map(inventoryLevels.map(level => [level.productId, level])), [inventoryLevels])
  const categoryById = useMemo(() => new Map(categories.map(category => [category.id, category.name])), [categories])

  const stockStatusData = useMemo(() => {
    let inStock = 0
    let lowStock = 0
    let outOfStock = 0
    products.forEach(product => {
      const inventory = inventoryByProduct.get(product.id)
      const totalUnits = inventory ? inventory.wholesaleQty + inventory.retailQty + inventory.shelfQty : 0
      if (totalUnits === 0) {
        outOfStock += 1
      } else if (inventory && totalUnits <= inventory.reorderLevel) {
        lowStock += 1
      } else {
        inStock += 1
      }
    })
    return [
      { name: "In Stock", value: inStock, color: "hsl(var(--chart-2))" },
      { name: "Low Stock", value: lowStock, color: "hsl(var(--chart-4))" },
      { name: "Out of Stock", value: outOfStock, color: "hsl(var(--destructive))" },
    ]
  }, [products, inventoryByProduct])

  const categoryStockData = useMemo(() => {
    const grouped = new Map<string, { category: string; wholesale: number; retail: number; shelf: number }>()
    products.forEach(product => {
      const category = categoryById.get(product.categoryId) ?? "Uncategorized"
      const inventory = inventoryByProduct.get(product.id)
      const entry = grouped.get(category) ?? { category, wholesale: 0, retail: 0, shelf: 0 }
      entry.wholesale += inventory?.wholesaleQty ?? 0
      entry.retail += inventory?.retailQty ?? 0
      entry.shelf += inventory?.shelfQty ?? 0
      grouped.set(category, entry)
    })
    return Array.from(grouped.values()).sort((a, b) => (b.wholesale + b.retail + b.shelf) - (a.wholesale + a.retail + a.shelf)).slice(0, 8)
  }, [products, inventoryByProduct, categoryById])

  const lowStockItems = useMemo(
    () =>
      products
        .map(product => {
          const inventory = inventoryByProduct.get(product.id)
          const current = inventory ? inventory.wholesaleQty + inventory.retailQty + inventory.shelfQty : 0
          const minimum = inventory?.reorderLevel ?? 0
          return { name: product.name, sku: product.sku, current, minimum, status: current === 0 ? "critical" : "low" }
        })
        .filter(item => item.minimum > 0 && item.current <= item.minimum)
        .sort((a, b) => a.current - b.current)
        .slice(0, 10),
    [products, inventoryByProduct]
  )

  const stockMovement = useMemo(() => {
    const filteredMovements = movements.filter(movement => {
      const createdAt = new Date(movement.createdAt)
      return createdAt >= effectiveRange.from && createdAt <= effectiveRange.to
    })

    const grouped = new Map<string, { item: string; received: number; sold: number; adjustment: number; net: number }>()
    filteredMovements.forEach(movement => {
      const entry = grouped.get(movement.productId) ?? { item: movement.productName, received: 0, sold: 0, adjustment: 0, net: 0 }
      if (movement.movementType === "receive") {
        entry.received += movement.quantity
        entry.net += movement.quantity
      } else if (movement.movementType === "sale") {
        entry.sold += movement.quantity
        entry.net -= movement.quantity
      } else if (movement.movementType === "adjustment") {
        entry.adjustment += movement.quantity
        entry.net += movement.quantity
      }
      grouped.set(movement.productId, entry)
    })

    return Array.from(grouped.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).slice(0, 10)
  }, [movements, effectiveRange])

  const totalItems = products.length
  const totalOnHandUnits = inventoryLevels.reduce((acc, level) => acc + level.wholesaleQty + level.retailQty + level.shelfQty, 0)
  const outOfStockCount = stockStatusData.find(item => item.name === "Out of Stock")?.value ?? 0
  const reorderCount = lowStockItems.length + outOfStockCount

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total SKUs</p>
          <p className="text-2xl font-bold">{totalItems}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total On-hand Units</p>
          <p className="text-2xl font-bold">{totalOnHandUnits}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Items Needing Reorder</p>
          <p className="text-2xl font-bold text-amber-500">{reorderCount}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-lg font-semibold">Stock Status Distribution</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {stockStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold">Stock by Category and Tier</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStockData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="category" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <Bar dataKey="wholesale" name="Wholesale" fill="hsl(var(--chart-1))" stackId="a" />
                <Bar dataKey="retail" name="Retail" fill="hsl(var(--chart-2))" stackId="a" />
                <Bar dataKey="shelf" name="Shelf" fill="hsl(var(--chart-3))" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Low Stock Alerts</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Minimum Level</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lowStockItems.length > 0 ? lowStockItems.map((item) => (
              <TableRow key={item.sku}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{item.current}</span>
                    <Progress value={item.minimum > 0 ? (item.current / item.minimum) * 100 : 0} className="h-2 w-16" />
                  </div>
                </TableCell>
                <TableCell>{item.minimum}</TableCell>
                <TableCell>
                  <Badge variant={item.status === "critical" ? "destructive" : "secondary"}>
                    {item.status === "critical" ? "Critical" : "Low"}
                  </Badge>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No low stock items in the selected period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Stock Movement Summary</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead className="text-right">Adjustment</TableHead>
              <TableHead className="text-right">Net Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockMovement.length > 0 ? stockMovement.map((item) => (
              <TableRow key={item.item}>
                <TableCell className="font-medium">{item.item}</TableCell>
                <TableCell className="text-right text-green-500">+{item.received}</TableCell>
                <TableCell className="text-right text-red-500">-{item.sold}</TableCell>
                <TableCell className="text-right text-muted-foreground">{item.adjustment >= 0 ? `+${item.adjustment}` : item.adjustment}</TableCell>
                <TableCell className={`text-right font-medium ${item.net >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {item.net >= 0 ? `+${item.net}` : item.net}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No stock movement data found for the selected period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
