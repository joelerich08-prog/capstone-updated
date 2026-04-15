'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/shared/date-range-picker'
import { formatCurrency } from '@/lib/utils/currency'
import { useTransactions } from '@/contexts/transaction-context'
import { useInventory } from '@/contexts/inventory-context'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Calendar,
  Download,
  Search,
  Package,
  BarChart3,
  ArrowUpDown,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6']

function AnalyticsCard({ children }: { children: React.ReactNode }) {
  return <Card>{children}</Card>
}

export function AnalyticsStatsCards() {
  const { transactions, getTodayTransactions } = useTransactions()
  const [period, setPeriod] = useState<'7' | '14' | '30' | 'custom'>('7')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const days = period === 'custom' && dateRange?.from && dateRange?.to
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : parseInt(period === 'custom' ? '7' : period)

  const getSalesByDay = (numDays: number) => {
    const result: { date: string; sales: number; transactions: number }[] = []
    for (let i = numDays - 1; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      const dayTxns = transactions.filter(t => {
        const txnDate = new Date(t.createdAt)
        return txnDate >= dayStart && txnDate <= dayEnd
      })
      result.push({
        date: format(date, 'MMM d'),
        sales: dayTxns.reduce((sum, t) => sum + t.total, 0),
        transactions: dayTxns.length,
      })
    }
    return result
  }

  const getSalesByDateRange = (from: Date, to: Date) => {
    const result: { date: string; sales: number; transactions: number }[] = []
    let current = from
    while (current <= to) {
      const dayStart = startOfDay(current)
      const dayEnd = endOfDay(current)
      const dayTxns = transactions.filter(t => {
        const txnDate = new Date(t.createdAt)
        return txnDate >= dayStart && txnDate <= dayEnd
      })
      result.push({
        date: format(current, 'MMM d'),
        sales: dayTxns.reduce((sum, t) => sum + t.total, 0),
        transactions: dayTxns.length,
      })
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000)
    }
    return result
  }

  const getSalesByPaymentType = () => {
    const paymentTypes = ['Cash', 'GCash', 'Maya'] as const
    return paymentTypes.map(type => {
      const typeLower = type.toLowerCase()
      const txns = transactions.filter(t => t.paymentType === typeLower)
      return {
        type,
        total: txns.reduce((sum, t) => sum + t.total, 0),
        count: txns.length,
      }
    })
  }

  const getPaymentTypesByDateRange = (from: Date, to: Date) => {
    const paymentTypes = ['Cash', 'GCash', 'Maya'] as const
    return paymentTypes.map(type => {
      const typeLower = type.toLowerCase()
      const txns = transactions.filter(t => {
        const txnDate = new Date(t.createdAt)
        return t.paymentType === typeLower && txnDate >= startOfDay(from) && txnDate <= endOfDay(to)
      })
      return {
        type,
        total: txns.reduce((sum, t) => sum + t.total, 0),
        count: txns.length,
      }
    })
  }

  const salesData = period === 'custom' && dateRange?.from && dateRange?.to
    ? getSalesByDateRange(dateRange.from, dateRange.to)
    : getSalesByDay(days)
  const paymentData = period === 'custom' && dateRange?.from && dateRange?.to
    ? getPaymentTypesByDateRange(dateRange.from, dateRange.to)
    : getSalesByPaymentType()
  const todayTransactions = getTodayTransactions()
  const totalSales = salesData.reduce((sum, day) => sum + day.sales, 0)
  const totalTransactions = salesData.reduce((sum, day) => sum + day.transactions, 0)
  const avgTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0
  const todaySales = todayTransactions.reduce((sum, tx) => sum + tx.total, 0)
  const referenceDate = period === 'custom' && dateRange?.from ? dateRange.from : subDays(new Date(), days)
  const previousPeriodSales = transactions
    .filter(tx => {
      const txDate = new Date(tx.createdAt)
      const start = subDays(referenceDate, days)
      const end = referenceDate
      return txDate >= start && txDate < end
    })
    .reduce((sum, tx) => sum + tx.total, 0)
  const growthRate = previousPeriodSales > 0
    ? ((totalSales - previousPeriodSales) / previousPeriodSales) * 100
    : 0
  const estimatedProfit = totalSales * 0.25

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          {period === 'custom' && <DatePickerWithRange date={dateRange} setDate={setDateRange} />}
        </div>
        <Button variant="outline">
          <Download className="mr-2 size-4" />
          Export Report
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-green-500/10">
                <DollarSign className="size-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-xl font-bold">{formatCurrency(totalSales)}</p>
                <p className={`text-xs ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}% vs previous period
                </p>
              </div>
            </div>
          </CardContent>
        </AnalyticsCard>
        <AnalyticsCard>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Receipt className="size-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold">{totalTransactions}</p>
                <p className="text-xs text-muted-foreground">Completed orders</p>
              </div>
            </div>
          </CardContent>
        </AnalyticsCard>
        <AnalyticsCard>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-purple-500/10">
                <CreditCard className="size-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Transaction</p>
                <p className="text-xl font-bold">{formatCurrency(avgTransactionValue)}</p>
                <p className="text-xs text-muted-foreground">Per order</p>
              </div>
            </div>
          </CardContent>
        </AnalyticsCard>
        <AnalyticsCard>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="size-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Profit</p>
                <p className="text-xl font-bold">{formatCurrency(estimatedProfit)}</p>
                <p className="text-xs text-muted-foreground">~25% margin</p>
              </div>
            </div>
          </CardContent>
        </AnalyticsCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Daily sales over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Sales']}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Distribution by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="total" nameKey="type" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {paymentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export function AnalyticsVolumeCard() {
  const { transactions } = useTransactions()
  const salesData = useMemo(() => {
    const result: { date: string; sales: number; transactions: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      const dayTxns = transactions.filter(t => {
        const txnDate = new Date(t.createdAt)
        return txnDate >= dayStart && txnDate <= dayEnd
      })
      result.push({ date: format(date, 'MMM d'), sales: dayTxns.reduce((sum, t) => sum + t.total, 0), transactions: dayTxns.length })
    }
    return result
  }, [transactions])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Volume</CardTitle>
        <CardDescription>Number of transactions per day</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip formatter={(value: number) => [value, 'Transactions']} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="transactions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function AnalyticsSummaryCards() {
  const { transactions } = useTransactions()
  const paymentData = [
    { type: 'Cash', total: transactions.filter(t => t.paymentType === 'cash').reduce((sum, t) => sum + t.total, 0), count: transactions.filter(t => t.paymentType === 'cash').length, icon: Banknote, color: 'bg-green-500/10 text-green-600' },
    { type: 'GCash', total: transactions.filter(t => t.paymentType === 'gcash').reduce((sum, t) => sum + t.total, 0), count: transactions.filter(t => t.paymentType === 'gcash').length, icon: Smartphone, color: 'bg-blue-500/10 text-blue-600' },
    { type: 'Maya', total: transactions.filter(t => t.paymentType === 'maya').reduce((sum, t) => sum + t.total, 0), count: transactions.filter(t => t.paymentType === 'maya').length, icon: CreditCard, color: 'bg-purple-500/10 text-purple-600' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {paymentData.map(payment => {
        const Icon = payment.icon
        return (
          <Card key={payment.type}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`flex size-12 items-center justify-center rounded-lg ${payment.color}`}>
                  <Icon className="size-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{payment.type} Sales</p>
                  <p className="text-xl font-bold">{formatCurrency(payment.total)}</p>
                  <p className="text-xs text-muted-foreground">{payment.count} transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function ItemAnalyticsSection() {
  const { transactions } = useTransactions()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity'>('revenue')
  const [period, setPeriod] = useState<'7' | '14' | '30' | 'custom'>('7')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const effectiveDateRange = useMemo(() => {
    if (period === 'custom' && dateRange?.from && dateRange?.to) {
      return { from: dateRange.from, to: dateRange.to }
    }
    const days = parseInt(period)
    return { from: subDays(new Date(), days - 1), to: new Date() }
  }, [period, dateRange])

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.createdAt)
      return txDate >= effectiveDateRange.from && txDate <= effectiveDateRange.to
    })
  }, [effectiveDateRange, transactions])

  const itemAnalytics = useMemo(() => {
    const itemMap: Record<string, { name: string; quantity: number; revenue: number; transactions: number }> = {}
    filteredTransactions.forEach(tx => {
      tx.items.forEach(item => {
        if (!itemMap[item.productId]) {
          itemMap[item.productId] = { name: item.productName, quantity: 0, revenue: 0, transactions: 0 }
        }
        itemMap[item.productId].quantity += item.quantity
        itemMap[item.productId].revenue += item.subtotal
        itemMap[item.productId].transactions++
      })
    })

    const categories = ['Canned Goods', 'Beverages', 'Snacks', 'Personal Care', 'Instant Noodles', 'Dairy']
    return Object.entries(itemMap)
      .map(([productId, data]) => ({
        productId,
        name: data.name,
        category: categories[Math.floor(Math.random() * categories.length)],
        quantitySold: data.quantity,
        revenue: data.revenue,
        avgPrice: data.revenue / data.quantity,
        trend: (Math.random() - 0.3) * 40,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [filteredTransactions])

  const topItems = itemAnalytics.slice(0, 10)
  const categories = [...new Set(itemAnalytics.map(item => item.category))]
  const filteredItems = itemAnalytics
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => sortBy === 'revenue' ? b.revenue - a.revenue : b.quantitySold - a.quantitySold)
  const totalRevenue = itemAnalytics.reduce((sum, item) => sum + item.revenue, 0)
  const totalQuantity = itemAnalytics.reduce((sum, item) => sum + item.quantitySold, 0)

  return (
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
              <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'revenue' | 'quantity')}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="mr-2 size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">By Revenue</SelectItem>
                <SelectItem value="quantity">By Quantity</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                <TableHead>Share</TableHead>
                <TableHead className="text-right">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.slice(0, 15).map((item, index) => {
                const sharePercent = (item.revenue / totalRevenue) * 100
                return (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">Avg: {formatCurrency(item.avgPrice)}</div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantitySold.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(item.revenue)}</TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <Progress value={sharePercent} className="h-2" />
                        <span className="text-xs text-muted-foreground w-12">{sharePercent.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`flex items-center justify-end gap-1 ${item.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.trend >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                        <span className="text-sm font-medium">{Math.abs(item.trend).toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Showing {Math.min(15, filteredItems.length)} of {filteredItems.length} products
        </div>
      </CardContent>
    </Card>
  )
}
