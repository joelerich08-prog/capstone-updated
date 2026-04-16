'use client'

import { useState, useMemo, useEffect } from 'react'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePagination } from '@/hooks/use-pagination'
import { TablePagination } from '@/components/shared/table-pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { DatePickerWithRange } from '@/components/shared/date-range-picker'
import { formatCurrency, formatPesoShort } from '@/lib/utils/currency'
import { apiFetch } from '@/lib/api-client'
import type { DateRange } from 'react-day-picker'
import { subDays, format } from 'date-fns'
import { 
  Search, 
  TrendingUp, 
  TrendingDown,
  Package,
  BarChart3,
  Download,
  ArrowUpDown,
  Calendar
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const CHART_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
]

interface ItemAnalytics {
  productId: string
  name: string
  category: string
  quantitySold: number
  revenue: number
  cost: number
  profit: number
  profitMargin: number
  avgCost: number
  avgPrice: number
  trend: number
}

export default function ItemsAnalyticsPage() {
  const [items, setItems] = useState<ItemAnalytics[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'profit'>('revenue')
  const [period, setPeriod] = useState<'7' | '14' | '30' | 'custom'>('7')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const defaultRangeDays = period === '7' || period === '14' || period === '30' ? parseInt(period) : 7
  const effectiveDateRange = period === 'custom' && dateRange?.from && dateRange?.to
    ? { from: dateRange.from, to: dateRange.to }
    : { from: subDays(new Date(), defaultRangeDays - 1), to: new Date() }

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true)
      setAnalyticsError(null)
      try {
        const params = new URLSearchParams()
        params.set('period', period)

        if (period === 'custom' && dateRange?.from && dateRange?.to) {
          params.set('startDate', format(dateRange.from, 'yyyy-MM-dd'))
          params.set('endDate', format(dateRange.to, 'yyyy-MM-dd'))
        }

        const result = await apiFetch<{
          items: ItemAnalytics[]
        }>(`/api/analytics/items_performance.php?${params.toString()}`)

        setItems(result.items)
      } catch (error) {
        console.error('Failed to load item analytics:', error)
        setAnalyticsError(error instanceof Error ? error.message : 'Unable to load item analytics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchItems()
  }, [period, dateRange])

  const topItems = items.slice(0, 10)

  const categories = [...new Set(items.map(item => item.category))]

  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => sortBy === 'revenue'
      ? b.revenue - a.revenue
      : sortBy === 'profit'
        ? b.profit - a.profit
        : b.quantitySold - a.quantitySold)

  const pagination = usePagination(filteredItems, { itemsPerPage: 15 })
  const pageItems = pagination.paginatedItems

  const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0)
  const totalProfit = items.reduce((sum, item) => sum + item.profit, 0)
  const averageProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  const totalQuantity = items.reduce((sum, item) => sum + item.quantitySold, 0)

  const categorySummary = useMemo(() => {
    const map = new Map<string, { revenue: number; profit: number; quantity: number }>()
    items.forEach(item => {
      const existing = map.get(item.category) ?? { revenue: 0, profit: 0, quantity: 0 }
      existing.revenue += item.revenue
      existing.profit += item.profit
      existing.quantity += item.quantitySold
      map.set(item.category, existing)
    })

    return Array.from(map.entries())
      .map(([category, summary]) => ({
        category,
        revenue: summary.revenue,
        profit: summary.profit,
        margin: summary.revenue > 0 ? (summary.profit / summary.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
  }, [items])

  // Export to CSV function
  const handleExport = () => {
    const headers = ['Rank', 'Product', 'Category', 'Quantity Sold', 'Revenue (PHP)', 'Profit (PHP)', 'Margin (%)', 'Avg Price (PHP)', 'Share (%)', 'Trend (%)']
    const rows = filteredItems.map((item, index) => {
      const sharePercent = (item.revenue / totalRevenue) * 100
      return [
        index + 1,
        `"${item.name}"`,
        item.category,
        item.quantitySold,
        item.revenue.toFixed(2),
        item.profit.toFixed(2),
        item.profitMargin.toFixed(1),
        item.avgPrice.toFixed(2),
        sharePercent.toFixed(2),
        item.trend.toFixed(2)
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    const dateStr = format(effectiveDateRange.from, 'yyyy-MM-dd') + '_to_' + format(effectiveDateRange.to, 'yyyy-MM-dd')
    link.setAttribute('download', `sales-by-item_${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardShell
      title="Sales by Item"
      description="Analyze product performance and sales trends"
      allowedRoles={['admin']}
    >
      {/* Period Selector and Date Range Picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={period} onValueChange={(v) => setPeriod(v as '7' | '14' | '30' | 'custom')}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="mr-2 size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="14">Last 14 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        {period === 'custom' && (
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        )}
      </div>

      {/* Top Sellers Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Best Sellers</CardTitle>
          <CardDescription>Products ranked by total revenue</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
              Loading item analytics...
            </div>
          ) : analyticsError ? (
            <div className="flex h-[350px] items-center justify-center text-sm text-destructive">
              {analyticsError}
            </div>
          ) : topItems.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topItems}
                  layout="vertical"
                  margin={{ left: 120, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value: any) => formatPesoShort(Number(value))}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={110}
                  />
                  <Tooltip
                    formatter={((value: any) => [formatCurrency(value), 'Revenue']) as any}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {topItems.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[350px] items-center justify-center text-center text-sm text-muted-foreground">
              No item sales data is available for the selected period.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products Sold</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <Package className="size-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Units Sold</p>
                <p className="text-2xl font-bold">{totalQuantity.toLocaleString()}</p>
              </div>
              <BarChart3 className="size-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
              <TrendingUp className="size-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(totalProfit)}</p>
                <p className="text-xs text-muted-foreground">Avg margin {averageProfitMargin.toFixed(1)}%</p>
              </div>
              <TrendingUp className="size-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Profit by Category</CardTitle>
          <CardDescription>Top categories by profit for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categorySummary.map(category => (
              <Card key={category.category} className="border">
                <CardContent>
                  <p className="text-sm text-muted-foreground">{category.category}</p>
                  <p className="text-2xl font-bold">{formatCurrency(category.profit)}</p>
                  <p className="text-xs text-muted-foreground">Revenue {formatCurrency(category.revenue)}</p>
                  <p className="text-xs text-muted-foreground">Margin {category.margin.toFixed(1)}%</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full Item List */}
      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>Complete sales breakdown by item</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex flex-1 flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(categoryName => (
                    <SelectItem key={categoryName} value={categoryName}>{categoryName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'revenue' | 'quantity' | 'profit')}>
                <SelectTrigger className="w-[160px]">
                  <ArrowUpDown className="mr-2 size-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">By Revenue</SelectItem>
                  <SelectItem value="quantity">By Quantity</SelectItem>
                  <SelectItem value="profit">By Profit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 size-4" />
              Export
            </Button>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Share</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((item, index) => {
                  const sharePercent = (item.revenue / totalRevenue) * 100
                  return (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium text-muted-foreground">
                        {pagination.startIndex + index}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Avg: {formatCurrency(item.avgPrice)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.quantitySold.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(item.revenue)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(item.profit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.profitMargin.toFixed(1)}%
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress value={sharePercent} className="h-2" />
                          <span className="text-xs text-muted-foreground w-12">
                            {sharePercent.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end gap-1 ${item.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.trend >= 0 ? (
                            <TrendingUp className="size-4" />
                          ) : (
                            <TrendingDown className="size-4" />
                          )}
                          <span className="text-sm font-medium">
                            {Math.abs(item.trend).toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={pagination.goToPage}
            onPrevPage={pagination.goToPrevPage}
            onNextPage={pagination.goToNextPage}
            onItemsPerPageChange={pagination.setItemsPerPage}
          />
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
