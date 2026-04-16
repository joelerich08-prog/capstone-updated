'use client'

import dynamic from 'next/dynamic'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { StatCard } from '@/components/shared/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTransactions } from '@/contexts/transaction-context'
import { useOrders } from '@/contexts/order-context'
import { useBatches } from '@/contexts/batch-context'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { formatPeso } from '@/lib/utils/currency'
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  ClipboardList,
  Plus,
  ArrowRight,
  Clock,
  DollarSign,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'

const SalesChart = dynamic(
  () => import('@/components/analytics/sales-chart').then(mod => mod.SalesChart),
  {
    ssr: false,
    loading: () => <DashboardWidgetSkeleton title="Sales Trend" description="Daily sales over the past week" heightClassName="h-[300px]" />,
  }
)

const TopItems = dynamic(
  () => import('@/components/analytics/top-items').then(mod => mod.TopItems),
  {
    ssr: false,
    loading: () => <DashboardWidgetSkeleton title="Top Selling Items" description="Best performing products by revenue" />,
  }
)

const InventoryStatus = dynamic(
  () => import('@/components/analytics/inventory-status').then(mod => mod.InventoryStatus),
  {
    ssr: false,
    loading: () => <DashboardWidgetSkeleton title="Three-Tier Inventory" description="Stock levels across warehouse, retail, and shelf" heightClassName="h-[300px]" />,
  }
)

const RecentTransactions = dynamic(
  () => import('@/components/analytics/recent-transactions').then(mod => mod.RecentTransactions),
  {
    ssr: false,
    loading: () => <DashboardWidgetSkeleton title="Recent Transactions" description="Latest sales transactions" />,
  }
)

const AlertsPanel = dynamic(
  () => import('@/components/analytics/alerts-panel').then(mod => mod.AlertsPanel),
  {
    ssr: false,
    loading: () => <DashboardWidgetSkeleton title="Active Alerts" description="Items requiring attention" />,
  }
)

const ExpiryAlertsPanel = dynamic(
  () => import('@/components/analytics/expiry-alerts-panel').then(mod => mod.ExpiryAlertsPanel),
  {
    ssr: false,
    loading: () => <DashboardWidgetSkeleton title="Expiry Tracker" description="Product batch expiration status" />,
  }
)

const PendingOrders = dynamic(
  () => import('@/components/analytics/pending-orders').then(mod => mod.PendingOrders),
  {
    ssr: false,
    loading: () => <DashboardWidgetSkeleton title="Online Orders" description="Recent orders from all channels" />,
  }
)

function DashboardWidgetSkeleton({
  title,
  description,
  heightClassName = 'h-[220px]',
}: {
  title: string
  description: string
  heightClassName?: string
}) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className={`space-y-4 ${heightClassName}`}>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <p className="sr-only">
            {title}
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const { getTodayTransactions, getYesterdayTransactions, getYesterdayStats, transactions } = useTransactions()
  const { getPendingOrdersCount } = useOrders()
  const { getBatchSummary, getCriticalBatches } = useBatches()
  const { stats: dashboardStats, isLoading: dashboardLoading } = useDashboardStats()
  const todayTx = getTodayTransactions()
  const batchSummary = getBatchSummary()
  const criticalBatches = getCriticalBatches()
  const pendingOrders = getPendingOrdersCount()

  // Calculate today's stats from transactions
  const stats = {
    todaySales: dashboardStats.todaySales,
    totalTransactions: transactions.length,
  }

  // Calculate yesterday's stats for real comparison
  const yesterdayStats = getYesterdayStats()
  const yesterdayTx = getYesterdayTransactions()
  const yesterdayComparison = {
    sales: yesterdayStats.sales,
    transactions: yesterdayTx.length,
  }

  const salesTrend = yesterdayComparison.sales > 0
    ? ((stats.todaySales / yesterdayComparison.sales - 1) * 100)
    : stats.todaySales > 0
      ? 100
      : 0

  return (
    <DashboardShell
      title="Dashboard"
      description="Overview of your store performance"
      allowedRoles={['admin']}
    >
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button asChild>
          <Link href="/admin/pos">
            <Plus className="size-4 mr-2" />
            New Sale
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/inventory/receive">
            <Package className="size-4 mr-2" />
            Receive Stock
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/orders">
            <ClipboardList className="size-4 mr-2" />
            View Orders
            {pendingOrders > 0 && (
              <span className="ml-2 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">
                {pendingOrders}
              </span>
            )}
          </Link>
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 mb-6">
        <StatCard
          title="Today's Sales"
          value={formatPeso(stats.todaySales)}
          icon={TrendingUp}
          trend={yesterdayComparison.sales > 0 ? {
            value: `${salesTrend >= 0 ? '+' : ''}${salesTrend.toFixed(1)}%`,
            positive: salesTrend >= 0,
          } : stats.todaySales > 0 ? {
            value: '+100.0%',
            positive: true,
          } : undefined}
          description={dashboardLoading ? 'Updating...' : yesterdayComparison.sales > 0 ? "vs yesterday" : stats.todaySales > 0 ? "First sales recorded vs yesterday" : "No data yesterday"}
        />
        <StatCard
          title="Transactions"
          value={todayTx.length.toString()}
          icon={ShoppingCart}
          trend={yesterdayComparison.transactions > 0 ? {
            value: `${todayTx.length >= yesterdayComparison.transactions ? '+' : ''}${todayTx.length - yesterdayComparison.transactions}`,
            positive: todayTx.length >= yesterdayComparison.transactions,
          } : undefined}
          description={yesterdayComparison.transactions > 0 ? "vs yesterday" : "No data yesterday"}
        />
        <StatCard
          title="Low Stock Items"
          value={dashboardStats.lowStockCount.toString()}
          icon={Package}
          description={dashboardLoading ? 'Updating...' : `${dashboardStats.lowStockCount} low stock alerts`}
          className={dashboardStats.lowStockCount > 0 ? 'border-orange-500/30' : ''}
        />
        <StatCard
          title="Critical Stock"
          value={dashboardStats.outOfStockCount.toString()}
          icon={AlertTriangle}
          description={dashboardLoading ? 'Updating...' : `${dashboardStats.outOfStockCount} out of stock`}
          className={dashboardStats.outOfStockCount > 0 ? 'border-destructive/30' : ''}
        />
        <StatCard
          title="Pending Orders"
          value={pendingOrders.toString()}
          icon={AlertTriangle}
          description="Awaiting fulfillment"
          className={pendingOrders > 0 ? 'border-primary/30' : ''}
        />
        <StatCard
          title="Expiring Soon"
          value={batchSummary.expiringSoon.toString()}
          icon={Clock}
          description={`${criticalBatches.length} critical`}
          className={criticalBatches.length > 0 ? 'border-destructive/30' : batchSummary.expiringSoon > 0 ? 'border-orange-500/30' : ''}
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 mb-6">
        <StatCard
          title="Today's Profit"
          value={formatPeso(dashboardStats.todayProfit)}
          icon={DollarSign}
          description={dashboardLoading ? 'Updating...' : 'Net profit today'}
          className="border-green-500/30"
        />
        <StatCard
          title="Top Product"
          value={dashboardStats.topProducts.length > 0 ? dashboardStats.topProducts[0].productName : 'No sales yet'}
          icon={Trophy}
          description={dashboardStats.topProducts.length > 0 ? `${dashboardStats.topProducts[0].totalQuantity} units sold` : 'No data available'}
          className="border-yellow-500/30"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
        <SalesChart />
        <TopItems />
      </div>

      {/* Inventory, Expiry, and Alerts Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3 mb-6">
        <InventoryStatus />
        <ExpiryAlertsPanel />
        <AlertsPanel />
      </div>

      {/* Transactions and Orders Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <RecentTransactions />
        <PendingOrders />
      </div>
    </DashboardShell>
  )
}
