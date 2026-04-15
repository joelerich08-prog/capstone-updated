"use client"

import { useMemo } from "react"
import type { DateRange } from "react-day-picker"
import { eachDayOfInterval, endOfDay, format, startOfDay, subDays } from "date-fns"
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useTransactions } from "@/contexts/transaction-context"
import { useProducts } from "@/contexts/products-context"

interface ProfitReportLiveProps {
  dateRange: DateRange | undefined
}

export function ProfitReportLive({ dateRange }: ProfitReportLiveProps) {
  const { transactions } = useTransactions()
  const { products, categories } = useProducts()

  const effectiveRange = useMemo(() => {
    const to = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(new Date())
    const from = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(subDays(to, 29))
    return { from, to }
  }, [dateRange])

  const rangeDays = Math.max(1, Math.ceil((effectiveRange.to.getTime() - effectiveRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  const previousRange = useMemo(
    () => ({
      from: startOfDay(subDays(effectiveRange.from, rangeDays)),
      to: endOfDay(subDays(effectiveRange.from, 1)),
    }),
    [effectiveRange, rangeDays]
  )

  const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products])
  const categoryNameById = useMemo(() => new Map(categories.map(category => [category.id, category.name])), [categories])

  const aggregateTransactions = (start: Date, end: Date) => {
    const filtered = transactions.filter(tx => {
      const createdAt = new Date(tx.createdAt)
      return createdAt >= start && createdAt <= end
    })
    const revenue = filtered.reduce((sum, tx) => sum + tx.total, 0)
    const cost = filtered.reduce(
      (sum, tx) =>
        sum +
        tx.items.reduce((itemSum, item) => {
          const product = productById.get(item.productId)
          return itemSum + (product?.costPrice ?? 0) * item.quantity
        }, 0),
      0
    )
    return { filtered, revenue, cost, profit: revenue - cost }
  }

  const currentPeriod = aggregateTransactions(effectiveRange.from, effectiveRange.to)
  const previousPeriod = aggregateTransactions(previousRange.from, previousRange.to)

  const buildChange = (current: number, previous: number) => {
    if (previous <= 0) {
      return current > 0
        ? { icon: TrendingUp, text: "+100.0% vs last period", className: "text-green-500" }
        : { icon: Minus, text: "No prior data", className: "text-muted-foreground" }
    }
    const change = ((current - previous) / previous) * 100
    return {
      icon: change >= 0 ? TrendingUp : TrendingDown,
      text: `${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs last period`,
      className: change >= 0 ? "text-green-500" : "text-red-500",
    }
  }

  const revenueChange = buildChange(currentPeriod.revenue, previousPeriod.revenue)
  const costChange = buildChange(currentPeriod.cost, previousPeriod.cost)
  const profitChange = buildChange(currentPeriod.profit, previousPeriod.profit)
  const currentMargin = currentPeriod.revenue > 0 ? (currentPeriod.profit / currentPeriod.revenue) * 100 : 0
  const previousMargin = previousPeriod.revenue > 0 ? (previousPeriod.profit / previousPeriod.revenue) * 100 : 0
  const marginChange = buildChange(currentMargin, previousMargin)

  const profitData = useMemo(() => {
    const midpoint = Math.ceil(rangeDays / 2)
    const periods = [
      { label: "Period 1", start: effectiveRange.from, end: endOfDay(subDays(effectiveRange.from, -(midpoint - 1))) },
      { label: "Period 2", start: startOfDay(subDays(effectiveRange.from, -midpoint)), end: effectiveRange.to },
    ]

    return periods
      .filter(period => period.start <= period.end)
      .map(period => {
        const aggregate = aggregateTransactions(period.start, period.end)
        return {
          period: period.label,
          revenue: aggregate.revenue,
          cost: aggregate.cost,
          profit: aggregate.profit,
        }
      })
  }, [effectiveRange, rangeDays, transactions, productById])

  const dailyProfitTrend = useMemo(
    () =>
      eachDayOfInterval({ start: effectiveRange.from, end: effectiveRange.to }).map(day => {
        const aggregate = aggregateTransactions(startOfDay(day), endOfDay(day))
        return { date: format(day, "MMM d"), profit: aggregate.profit }
      }),
    [effectiveRange, transactions, productById]
  )

  const marginByCategory = useMemo(() => {
    const grouped = new Map<string, { category: string; revenue: number; cost: number; margin: number }>()
    currentPeriod.filtered.forEach(tx => {
      tx.items.forEach(item => {
        const product = productById.get(item.productId)
        const category = categoryNameById.get(product?.categoryId ?? "") ?? "Uncategorized"
        const entry = grouped.get(category) ?? { category, revenue: 0, cost: 0, margin: 0 }
        entry.revenue += item.subtotal
        entry.cost += (product?.costPrice ?? 0) * item.quantity
        grouped.set(category, entry)
      })
    })

    return Array.from(grouped.values())
      .map(entry => ({
        ...entry,
        margin: entry.revenue > 0 ? ((entry.revenue - entry.cost) / entry.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [currentPeriod.filtered, productById, categoryNameById])

  const profitBreakdown = useMemo(() => {
    const totalDiscounts = currentPeriod.filtered.reduce((sum, tx) => sum + tx.discount, 0)
    return [
      { category: "Net Sales", amount: currentPeriod.revenue, percentage: 100 },
      { category: "Cost of Goods Sold", amount: currentPeriod.cost, percentage: currentPeriod.revenue > 0 ? (currentPeriod.cost / currentPeriod.revenue) * 100 : 0 },
      { category: "Discounts Recorded", amount: totalDiscounts, percentage: currentPeriod.revenue > 0 ? (totalDiscounts / currentPeriod.revenue) * 100 : 0 },
      { category: "Gross Profit", amount: currentPeriod.profit, percentage: currentPeriod.revenue > 0 ? (currentPeriod.profit / currentPeriod.revenue) * 100 : 0 },
    ]
  }, [currentPeriod])

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold">{formatCurrency(currentPeriod.revenue)}</p>
          <div className={`mt-1 flex items-center text-sm ${revenueChange.className}`}>
            <revenueChange.icon className="mr-1 h-4 w-4" />
            {revenueChange.text}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold">{formatCurrency(currentPeriod.cost)}</p>
          <div className={`mt-1 flex items-center text-sm ${costChange.className}`}>
            <costChange.icon className="mr-1 h-4 w-4" />
            {costChange.text}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Gross Profit</p>
          <p className={`text-2xl font-bold ${currentPeriod.profit >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(currentPeriod.profit)}</p>
          <div className={`mt-1 flex items-center text-sm ${profitChange.className}`}>
            <profitChange.icon className="mr-1 h-4 w-4" />
            {profitChange.text}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Profit Margin</p>
          <p className="text-2xl font-bold">{currentMargin.toFixed(1)}%</p>
          <div className={`mt-1 flex items-center text-sm ${marginChange.className}`}>
            <marginChange.icon className="mr-1 h-4 w-4" />
            {marginChange.text}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Revenue vs Cost vs Profit</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" className="text-xs" />
              <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} className="text-xs" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name="Cost" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ fill: "hsl(var(--chart-2))" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Daily Profit Trend</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyProfitTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} className="text-xs" />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Profit"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Area type="monotone" dataKey="profit" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-lg font-semibold">Profit Margin by Category</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marginByCategory.length > 0 ? marginByCategory.map((item) => (
                <TableRow key={item.category}>
                  <TableCell className="font-medium">{item.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(item.cost)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-medium ${item.margin >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {item.margin.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No profit data found for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold">Profit Breakdown</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">% of Net Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profitBreakdown.map((item) => (
                <TableRow key={item.category}>
                  <TableCell className="font-medium">{item.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.percentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
