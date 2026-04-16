'use client'

import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatPesoShort } from '@/lib/utils/currency'
import { apiFetch } from '@/lib/api-client'
import { 
  TrendingUp, 
  AlertTriangle,
  Clock,
  ShoppingCart,
  ArrowRight
} from 'lucide-react'
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts'

interface ForecastPoint {
  date: string
  actual?: number
  forecast?: number
}

interface ProjectionSummary {
  projection: number
  lastWeekActual: number
  changePercent: number
}

interface StockForecastItem {
  id: string
  name: string
  currentStock: number
  avgDailySales: number
  daysUntilStockout: number
  reorderPoint: number
  inventoryTurnover: number
  needsReorder: boolean
  status: 'critical' | 'warning' | 'healthy'
}

export default function ForecastPage() {
  const [historicalData, setHistoricalData] = useState<ForecastPoint[]>([])
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([])
  const [projection, setProjection] = useState<ProjectionSummary>({ projection: 0, lastWeekActual: 0, changePercent: 0 })
  const [stockForecast, setStockForecast] = useState<StockForecastItem[]>([])
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const chartData = [...historicalData, ...forecastData]

  useEffect(() => {
    const fetchForecast = async () => {
      setIsLoading(true)
      setAnalyticsError(null)
      try {
        const result = await apiFetch<{
          historicalData: ForecastPoint[]
          forecastData: ForecastPoint[]
          projection: ProjectionSummary
          stockForecast: StockForecastItem[]
        }>('/api/analytics/forecast.php')

        setHistoricalData(result.historicalData)
        setForecastData(result.forecastData)
        setProjection(result.projection)
        setStockForecast(result.stockForecast)
      } catch (error) {
        console.error('Failed to load forecast analytics:', error)
        setAnalyticsError(error instanceof Error ? error.message : 'Unable to load forecast analytics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchForecast()
  }, [])
  
  const nextWeekProjection = projection.projection
  const projectionChange = projection.changePercent
  const criticalItems = stockForecast.filter(item => item.status === 'critical').length
  const warningItems = stockForecast.filter(item => item.status === 'warning').length
  const needsReorder = stockForecast.filter(item => item.needsReorder).length
  const averageTurnover = stockForecast.length > 0
    ? stockForecast.reduce((sum, item) => sum + item.inventoryTurnover, 0) / stockForecast.length
    : 0
  const averageStockDays = stockForecast.length > 0
    ? stockForecast.reduce((sum, item) => sum + item.daysUntilStockout, 0) / stockForecast.length
    : 0

  return (
    <DashboardShell
      title="Inventory Forecast"
      description="Sales predictions and stock depletion analysis"
      allowedRoles={['admin']}
    >
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-blue-500/10">
                <TrendingUp className="size-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">7-Day Projection</p>
                <p className="text-xl font-bold">{formatCurrency(nextWeekProjection)}</p>
                <p className={`text-xs ${projectionChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {projectionChange >= 0 ? '+' : ''}{projectionChange.toFixed(1)}% vs last week
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-red-500/10">
                <AlertTriangle className="size-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical Stock</p>
                <p className="text-xl font-bold">{criticalItems}</p>
                <p className="text-xs text-muted-foreground">Items need immediate reorder</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-yellow-500/10">
                <Clock className="size-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Warning</p>
                <p className="text-xl font-bold">{warningItems}</p>
                <p className="text-xs text-muted-foreground">Items running low</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-purple-500/10">
                <ShoppingCart className="size-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reorder Needed</p>
                <p className="text-xl font-bold">{needsReorder}</p>
                <p className="text-xs text-muted-foreground">Below reorder point</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Inventory Turnover</p>
                <p className="text-xl font-bold">{averageTurnover.toFixed(2)}x</p>
                <p className="text-xs text-muted-foreground">Annual inventory efficiency</p>
              </div>
              <TrendingUp className="size-8 text-sky-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Days Until Stockout</p>
                <p className="text-xl font-bold">{averageStockDays.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Across forecasted stock items</p>
              </div>
              <Clock className="size-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Forecast</CardTitle>
          <CardDescription>
            Weighted Moving Average with day-of-week seasonality (last 14 days history)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading forecast analytics...
              </div>
            ) : analyticsError ? (
              <div className="flex h-full items-center justify-center text-sm text-destructive">
                {analyticsError}
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No forecast data is available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
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
                  formatter={((value: any, name: any) => [
                    formatCurrency(value), 
                    name === 'actual' ? 'Actual Sales' : 'Forecast'
                  ]) as any}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-primary" />
              <span className="text-muted-foreground">Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-primary border-dashed" style={{ borderStyle: 'dashed' }} />
              <span className="text-muted-foreground">Forecast</span>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Forecasting Method:</p>
            <p>Uses Weighted Moving Average (WMA) with day-of-week seasonality. Recent days have higher weight. Weekends vs weekdays patterns are automatically detected and applied to predictions.</p>
          </div>
        </CardContent>
      </Card>

      {/* Stock Depletion Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Depletion Forecast</CardTitle>
          <CardDescription>
            Estimated days until stock runs out based on current sales velocity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stockForecast.map((item, index) => (
              <div key={`${item.id}-${index}`} className="rounded-lg border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge 
                        variant={
                          item.status === 'critical' ? 'destructive' : 
                          item.status === 'warning' ? 'secondary' : 
                          'default'
                        }
                      >
                        {item.status === 'critical' ? 'Critical' :
                         item.status === 'warning' ? 'Low' : 
                         'Healthy'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Current: {item.currentStock} units | Sells ~{item.avgDailySales}/day
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      item.status === 'critical' ? 'text-red-600' :
                      item.status === 'warning' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {item.daysUntilStockout} days
                    </p>
                    <p className="text-xs text-muted-foreground">until stockout</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Stock Level</span>
                    <span>{item.currentStock} / {item.reorderPoint * 3} (max)</span>
                  </div>
                  <Progress 
                    value={Math.min((item.currentStock / (item.reorderPoint * 3)) * 100, 100)} 
                    className={`h-2 ${
                      item.status === 'critical' ? '[&>div]:bg-red-500' :
                      item.status === 'warning' ? '[&>div]:bg-yellow-500' :
                      ''
                    }`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Inventory Turnover</span>
                    <span>{item.inventoryTurnover.toFixed(2)}x</span>
                  </div>
                </div>
                {item.needsReorder && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-orange-600">
                    <AlertTriangle className="size-4" />
                    <span>Below reorder point ({item.reorderPoint} units)</span>
                    <ArrowRight className="size-4 ml-auto" />
                    <span className="font-medium">Order Now</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
