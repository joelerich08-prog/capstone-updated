"use client"

import { useMemo } from "react"
import type { DateRange } from "react-day-picker"
import { eachDayOfInterval, endOfDay, format, startOfDay, subDays } from "date-fns"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils/currency"
import { Badge } from "@/components/ui/badge"
import { useTransactions } from "@/contexts/transaction-context"
import { useProducts } from "@/contexts/products-context"

interface SalesReportLiveProps {
  dateRange: DateRange | undefined
}

export function SalesReportLive({ dateRange }: SalesReportLiveProps) {
  const { transactions } = useTransactions()
  const { products, categories } = useProducts()

  const effectiveRange = useMemo(() => {
    const to = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(new Date())
    const from = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(subDays(to, 29))
    return { from, to }
  }, [dateRange])

  const filteredTransactions = useMemo(
    () =>
      transactions.filter(tx => {
        const createdAt = new Date(tx.createdAt)
        return createdAt >= effectiveRange.from && createdAt <= effectiveRange.to
      }),
    [transactions, effectiveRange]
  )

  const categoryNameById = useMemo(() => new Map(categories.map(category => [category.id, category.name])), [categories])
  const productCategoryById = useMemo(
    () => new Map(products.map(product => [product.id, categoryNameById.get(product.categoryId) ?? "Uncategorized"])),
    [products, categoryNameById]
  )

  const dailySalesData = useMemo(
    () =>
      eachDayOfInterval({ start: effectiveRange.from, end: effectiveRange.to }).map(day => {
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)
        const dayTransactions = filteredTransactions.filter(tx => {
          const createdAt = new Date(tx.createdAt)
          return createdAt >= dayStart && createdAt <= dayEnd
        })

        return {
          date: format(day, "MMM d"),
          sales: dayTransactions.reduce((sum, tx) => sum + tx.total, 0),
          transactions: dayTransactions.length,
        }
      }),
    [effectiveRange, filteredTransactions]
  )

  const paymentMethodData = useMemo(() => {
    const grouped = new Map<string, { method: string; amount: number; count: number }>()
    filteredTransactions.forEach(tx => {
      const label = tx.paymentType === "gcash" ? "GCash" : tx.paymentType === "maya" ? "Maya" : "Cash"
      const entry = grouped.get(tx.paymentType) ?? { method: label, amount: 0, count: 0 }
      entry.amount += tx.total
      entry.count += 1
      grouped.set(tx.paymentType, entry)
    })
    return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount)
  }, [filteredTransactions])

  const topSellingItems = useMemo(() => {
    const grouped = new Map<string, { name: string; category: string; quantity: number; revenue: number }>()
    filteredTransactions.forEach(tx => {
      tx.items.forEach(item => {
        const entry = grouped.get(item.productId) ?? {
          name: item.productName,
          category: productCategoryById.get(item.productId) ?? "Uncategorized",
          quantity: 0,
          revenue: 0,
        }
        entry.quantity += item.quantity
        entry.revenue += item.subtotal
        grouped.set(item.productId, entry)
      })
    })
    return Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  }, [filteredTransactions, productCategoryById])

  const totalSales = filteredTransactions.reduce((acc, tx) => acc + tx.total, 0)
  const totalTransactions = filteredTransactions.length
  const avgTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Sales</p>
          <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Transactions</p>
          <p className="text-2xl font-bold">{totalTransactions}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Avg. Transaction Value</p>
          <p className="text-2xl font-bold">{formatCurrency(avgTransactionValue)}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Daily Sales Trend</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailySalesData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} className="text-xs" />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Sales"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Sales by Payment Method</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paymentMethodData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
              <YAxis type="category" dataKey="method" width={80} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Amount"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="amount" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Top Selling Items</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Qty Sold</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topSellingItems.length > 0 ? topSellingItems.map((item) => (
              <TableRow key={item.name}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.category}</Badge>
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.revenue)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No sales data found for the selected period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
