"use client"

import { useMemo, useState } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/shared/date-range-picker"
import { SalesReportLive } from "@/components/reports/sales-report-live"
import { InventoryReportLive } from "@/components/reports/inventory-report-live"
import { ProfitReportLive } from "@/components/reports/profit-report-live"
import { Download, FileText, Printer } from "lucide-react"
import { addDays, endOfDay, format, startOfDay } from "date-fns"
import type { DateRange } from "react-day-picker"
import { useTransactions } from "@/contexts/transaction-context"
import { useProducts } from "@/contexts/products-context"
import { useInventory } from "@/contexts/inventory-context"
import { formatCurrency } from "@/lib/utils/currency"

function escapeCsv(value: string | number) {
  const stringValue = String(value)
  return `"${stringValue.replace(/"/g, '""')}"`
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = useState("sales")
  const { transactions } = useTransactions()
  const { products, categories } = useProducts()
  const { inventoryLevels } = useInventory()

  const effectiveRange = useMemo(() => {
    const from = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(addDays(new Date(), -30))
    const to = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(new Date())
    return { from, to }
  }, [dateRange])

  const filteredTransactions = useMemo(
    () => transactions.filter(tx => {
      const createdAt = new Date(tx.createdAt)
      return createdAt >= effectiveRange.from && createdAt <= effectiveRange.to
    }),
    [transactions, effectiveRange]
  )

  const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products])
  const categoryNameById = useMemo(() => new Map(categories.map(category => [category.id, category.name])), [categories])

  const handleExportCsv = () => {
    const rows: Array<Array<string | number>> = [["Report", "Label", "Value", "Notes"]]
    const rangeLabel = `${format(effectiveRange.from, "yyyy-MM-dd")} to ${format(effectiveRange.to, "yyyy-MM-dd")}`

    if (activeTab === "sales") {
      const paymentTotals = filteredTransactions.reduce<Record<string, number>>((acc, tx) => {
        acc[tx.paymentType] = (acc[tx.paymentType] || 0) + tx.total
        return acc
      }, {})
      rows.push(["Sales", "Range", rangeLabel, ""])
      rows.push(["Sales", "Transactions", filteredTransactions.length, "Completed transactions"])
      rows.push(["Sales", "Revenue", formatCurrency(filteredTransactions.reduce((sum, tx) => sum + tx.total, 0)), "Gross sales"])
      Object.entries(paymentTotals).forEach(([method, total]) => {
        rows.push(["Sales", `Payment: ${method}`, formatCurrency(total), ""])
      })
    }

    if (activeTab === "inventory") {
      rows.push(["Inventory", "Range", rangeLabel, ""])
      products.forEach(product => {
        const inventory = inventoryLevels.find(level => level.productId === product.id)
        const totalStock = (inventory?.wholesaleQty || 0) + (inventory?.retailQty || 0) + (inventory?.shelfQty || 0)
        rows.push([
          "Inventory",
          product.name,
          totalStock,
          categoryNameById.get(product.categoryId) ?? "Uncategorized",
        ])
      })
    }

    if (activeTab === "profit") {
      let revenue = 0
      let cost = 0
      filteredTransactions.forEach(tx => {
        revenue += tx.total
        tx.items.forEach(item => {
          const product = productById.get(item.productId)
          cost += (product?.costPrice ?? 0) * item.quantity
        })
      })
      const profit = revenue - cost
      rows.push(["Profit", "Range", rangeLabel, ""])
      rows.push(["Profit", "Revenue", formatCurrency(revenue), ""])
      rows.push(["Profit", "Cost", formatCurrency(cost), ""])
      rows.push(["Profit", "Gross Profit", formatCurrency(profit), ""])
      rows.push(["Profit", "Margin", `${revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0"}%`, ""])
    }

    const csvContent = rows.map(row => row.map(escapeCsv).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${activeTab}-report_${format(effectiveRange.from, "yyyy-MM-dd")}_to_${format(effectiveRange.to, "yyyy-MM-dd")}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardShell title="Reports" description="Generate and view business reports" allowedRoles={["admin"]}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <FileText className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="profit">Profit</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sales" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Report</CardTitle>
                <CardDescription>
                  Detailed breakdown of sales performance over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SalesReportLive dateRange={dateRange} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="inventory" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Report</CardTitle>
                <CardDescription>
                  Current stock levels and movement analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryReportLive dateRange={dateRange} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="profit" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss Report</CardTitle>
                <CardDescription>
                  Revenue, costs, and profit margins analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfitReportLive dateRange={dateRange} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
