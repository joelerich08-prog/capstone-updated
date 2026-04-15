'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatCard } from '@/components/shared/stat-card'
import { DatePickerWithRange } from '@/components/shared/date-range-picker'
import { formatCurrency, formatPesoShort } from '@/lib/utils/currency'
import { useTransactions } from '@/contexts/transaction-context'
import type { DateRange } from 'react-day-picker'
import {
  TrendingUp,
  DollarSign,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Calendar,
  Download,
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6']

const ResponsiveContainer: any = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer as any), { ssr: false })
const LineChart: any = dynamic(() => import('recharts').then(mod => mod.LineChart as any), { ssr: false })
const Line: any = dynamic(() => import('recharts').then(mod => mod.Line as any), { ssr: false })
const BarChart: any = dynamic(() => import('recharts').then(mod => mod.BarChart as any), { ssr: false })
const Bar: any = dynamic(() => import('recharts').then(mod => mod.Bar as any), { ssr: false })
const XAxis: any = dynamic(() => import('recharts').then(mod => mod.XAxis as any), { ssr: false })
const YAxis: any = dynamic(() => import('recharts').then(mod => mod.YAxis as any), { ssr: false })
const CartesianGrid: any = dynamic(() => import('recharts').then(mod => mod.CartesianGrid as any), { ssr: false })
const Tooltip: any = dynamic(() => import('recharts').then(mod => mod.Tooltip as any), { ssr: false })
const PieChart: any = dynamic(() => import('recharts').then(mod => mod.PieChart as any), { ssr: false })
const Pie: any = dynamic(() => import('recharts').then(mod => mod.Pie as any), { ssr: false })
const Cell: any = dynamic(() => import('recharts').then(mod => mod.Cell as any), { ssr: false })

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

export default function SalesAnalyticsPage() {
  const { transactions } = useTransactions()
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

  const totalSales = salesData.reduce((sum, day) => sum + day.sales, 0)
  const totalTransactions = salesData.reduce((sum, day) => sum + day.transactions, 0)
  const avgTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0

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

  const handleExportReport = () => {
    const startDate = period === 'custom' && dateRange?.from
      ? dateRange.from
      : subDays(new Date(), days - 1)
    const endDate = period === 'custom' && dateRange?.to
      ? dateRange.to
      : new Date()

    const startDateStr = format(startDate, 'yyyy-MM-dd')
    const endDateStr = format(endDate, 'yyyy-MM-dd')
    const rows: Array<Array<string | number>> = [
      ['Section', 'Label', 'Value', 'Notes'],
      ['Report', 'Period', `${format(startDate, 'MMMM d, yyyy')} - ${format(endDate, 'MMMM d, yyyy')}`, ''],
      ['Report', 'Generated On', format(new Date(), 'MMMM d, yyyy h:mm a'), ''],
      ['Summary', 'Total Revenue', formatCurrency(totalSales), 'Gross sales for the selected period'],
      ['Summary', 'Transactions', totalTransactions, 'Completed orders'],
      ['Summary', 'Average Order Value', formatCurrency(avgTransactionValue), 'Revenue per transaction'],
      ['Summary', 'Estimated Gross Profit', formatCurrency(estimatedProfit), 'Based on a 25% margin assumption'],
      ['Summary', 'Growth Rate', `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`, `Compared to the previous ${days} days`],
    ]

    salesData.forEach(day => {
      const avgPerTx = day.transactions > 0 ? day.sales / day.transactions : 0
      rows.push(['Daily Sales', day.date, formatCurrency(day.sales), `${day.transactions} transactions, avg ${formatCurrency(avgPerTx)}`])
    })

    const totalPaymentSales = paymentData.reduce((sum, payment) => sum + payment.total, 0)
    const totalPaymentCount = paymentData.reduce((sum, payment) => sum + payment.count, 0)
    paymentData.forEach(payment => {
      const revenuePercent = totalPaymentSales > 0 ? ((payment.total / totalPaymentSales) * 100).toFixed(1) : '0.0'
      const countPercent = totalPaymentCount > 0 ? ((payment.count / totalPaymentCount) * 100).toFixed(1) : '0.0'
      rows.push([
        'Payment Method',
        payment.type,
        formatCurrency(payment.total),
        `${payment.count} transactions, ${revenuePercent}% of revenue, ${countPercent}% of transactions`,
      ])
    })

    const csvContent = rows.map(row => row.map(escapeCsvValue).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sales-report_${startDateStr}_to_${endDateStr}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardShell
      title="Sales Analytics"
      description="Monitor sales performance and trends"
      allowedRoles={['admin']}
    >
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
          {period === 'custom' && (
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          )}
        </div>
        <Button variant="outline" onClick={handleExportReport}>
          <Download className="mr-2 size-4" />
          Export Report
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales"
          value={formatCurrency(totalSales)}
          icon={DollarSign}
          trend={{
            value: `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
            positive: growthRate >= 0,
          }}
        />
        <StatCard
          title="Transactions"
          value={totalTransactions.toString()}
          icon={Receipt}
        />
        <StatCard
          title="Avg. Transaction"
          value={formatCurrency(avgTransactionValue)}
          icon={CreditCard}
        />
        <StatCard
          title="Est. Profit"
          value={formatCurrency(estimatedProfit)}
          description="~25% margin"
          icon={TrendingUp}
        />
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
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value: any) => formatPesoShort(Number(value))}
                  />
                  <Tooltip
                    formatter={((value: any) => [formatCurrency(value), 'Sales']) as any}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
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
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="total"
                    nameKey="type"
                    label={({ name, percent }: { name: any; percent: any }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {paymentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={((value: any) => formatCurrency(value)) as any}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {paymentData.map((payment, index) => (
                <div key={payment.type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-3 rounded-full"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span>{payment.type}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(payment.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  formatter={((value: any) => [value, 'Transactions']) as any}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="transactions"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-green-500/10">
                <Banknote className="size-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash Sales</p>
                <p className="text-xl font-bold">{formatCurrency(paymentData[0]?.total || 0)}</p>
                <p className="text-xs text-muted-foreground">{paymentData[0]?.count || 0} transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Smartphone className="size-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">GCash Sales</p>
                <p className="text-xl font-bold">{formatCurrency(paymentData[1]?.total || 0)}</p>
                <p className="text-xs text-muted-foreground">{paymentData[1]?.count || 0} transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-purple-500/10">
                <CreditCard className="size-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maya Sales</p>
                <p className="text-xl font-bold">{formatCurrency(paymentData[2]?.total || 0)}</p>
                <p className="text-xs text-muted-foreground">{paymentData[2]?.count || 0} transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
