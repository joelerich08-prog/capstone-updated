"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/shared/date-range-picker"
import { SalesReportLive } from "@/components/reports/sales-report-live"
import { InventoryReportLive } from "@/components/reports/inventory-report-live"
import { ProfitReportLive } from "@/components/reports/profit-report-live"
import { Download, FileText, Printer } from "lucide-react"
import { addDays } from "date-fns"
import type { DateRange } from "react-day-picker"

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = useState("sales")

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
            <Button variant="outline" size="sm" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" disabled>
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
