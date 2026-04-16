'use client'

import { useState, useMemo, useCallback } from 'react'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useTransactions } from '@/contexts/transaction-context'
import { useUsers } from '@/contexts/users-context'
import { useInventory } from '@/contexts/inventory-context'
import { formatPeso } from '@/lib/utils/currency'
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns'
import { API_BASE_URL } from '@/lib/api-client'
import { usePagination } from '@/hooks/use-pagination'
import { TablePagination } from '@/components/shared/table-pagination'
import {
  Search,
  Eye,
  CalendarIcon,
  Download,
  Banknote,
  Smartphone,
  CreditCard,
  Receipt,
  TrendingUp,
  Users,
  Undo2,
} from 'lucide-react'
import type { Transaction } from '@/lib/types'
import type { DateRange } from 'react-day-picker'
import { toast } from 'sonner'

const paymentMethodConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  cash: { label: 'Cash', icon: Banknote, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  gcash: { label: 'GCash', icon: Smartphone, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  maya: { label: 'Maya', icon: CreditCard, color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
}

const transactionStatusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  refunded: { label: 'Refunded', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  cancelled: { label: 'Cancelled', color: 'bg-destructive/10 text-destructive border-destructive/20' },
}

export default function TransactionsPage() {
  const { transactions, refundTransaction } = useTransactions()
  const { refreshInventory } = useInventory()
  const { users } = useUsers()
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [cashierFilter, setCashierFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null)
  const [isRefunding, setIsRefunding] = useState(false)

  const hasActiveFilters =
    search !== '' ||
    paymentFilter !== 'all' ||
    statusFilter !== 'all' ||
    cashierFilter !== 'all' ||
    !!dateRange?.from

  // Get cashier name from user ID
  const getCashierName = useCallback((cashierId: string): string => {
    const user = users.find(u => u.id === cashierId)
    return user?.name || 'Unknown Cashier'
  }, [users])

  // Get unique cashiers from transactions
  const cashiers = useMemo(() => {
    const cashierIds = [...new Set(transactions.map(t => t.cashierId))]
    return cashierIds.map(id => ({
      id,
      name: getCashierName(id),
    }))
  }, [transactions, getCashierName])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      // Search filter (invoice number or product names)
      const matchesSearch = search === '' ||
        txn.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
        txn.items.some(item =>
          item.productName.toLowerCase().includes(search.toLowerCase()) ||
          (item.variantName?.toLowerCase().includes(search.toLowerCase()) ?? false)
        )

      // Payment method filter
      const matchesPayment = paymentFilter === 'all' || txn.paymentType === paymentFilter

      const matchesStatus = statusFilter === 'all' || txn.status === statusFilter

      // Cashier filter
      const matchesCashier = cashierFilter === 'all' || txn.cashierId === cashierFilter

      // Date range filter
      let matchesDate = true
      if (dateRange?.from) {
        const txnDate = new Date(txn.createdAt)
        const from = startOfDay(dateRange.from)
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from)
        matchesDate = isWithinInterval(txnDate, { start: from, end: to })
      }

      return matchesSearch && matchesPayment && matchesStatus && matchesCashier && matchesDate
    })
  }, [search, paymentFilter, statusFilter, cashierFilter, dateRange, transactions])

  const pagination = usePagination(filteredTransactions, { itemsPerPage: 10 })

  // Calculate summary stats
  const stats = useMemo(() => {
    const completedTransactions = filteredTransactions.filter(txn => txn.status === 'completed')
    const refundedTransactions = filteredTransactions.filter(txn => txn.status === 'refunded')
    const totalSales = completedTransactions.reduce((sum, txn) => sum + txn.total, 0)
    const totalTransactions = completedTransactions.length
    const avgTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0
    const refundedTotal = refundedTransactions.reduce((sum, txn) => sum + txn.total, 0)

    const paymentBreakdown = completedTransactions.reduce((acc, txn) => {
      acc[txn.paymentType] = (acc[txn.paymentType] || 0) + txn.total
      return acc
    }, {} as Record<string, number>)

    return { totalSales, totalTransactions, avgTransaction, refundedTotal, refundedCount: refundedTransactions.length, paymentBreakdown }
  }, [filteredTransactions])

  const handleExport = async () => {
    try {
      // Build query parameters from current filters
      const params = new URLSearchParams()
      
      if (search) params.append('search', search)
      if (paymentFilter !== 'all') params.append('paymentType', paymentFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (cashierFilter !== 'all') params.append('cashierId', cashierFilter)
      if (dateRange?.from) {
        params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'))
        if (dateRange.to) {
          params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'))
        }
      }

      // Download CSV from server
      const url = `${API_BASE_URL}/api/transactions/export_csv.php?${params.toString()}`
      const response = await fetch(url, { credentials: 'include' })
      
      if (!response.ok) {
        const text = await response.text()
        let errorMessage = text
        try {
          const json = JSON.parse(text)
          errorMessage = json.error || text
        } catch {
          // response was not JSON
        }
        toast.error(errorMessage || 'Failed to export transactions')
        return
      }

      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `transactions-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
      toast.success('Transactions exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export transactions')
    }
  }

  const handleRefund = async () => {
    if (!refundTarget) {
      return
    }

    setIsRefunding(true)
    const result = await refundTransaction(refundTarget.id)

    if (!result.success) {
      setIsRefunding(false)
      toast.error(result.error || 'Refund failed')
      return
    }

    await refreshInventory()
    setSelectedTransaction(prev => prev && prev.id === refundTarget.id ? { ...prev, status: 'refunded' } : prev)
    setRefundTarget(null)
    setIsRefunding(false)
    toast.success(`Refunded ${refundTarget.invoiceNo} and restored stock`)
  }

  return (
    <DashboardShell
      title="Transactions"
      description="View all transactions from all cashiers"
      allowedRoles={['admin']}
      headerAction={
        <Button variant="outline" onClick={handleExport}>
          <Download className="size-4 mr-2" />
          Export CSV
        </Button>
      }
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold tabular-nums">{formatPeso(stats.totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold tabular-nums">{stats.totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="size-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Transaction</p>
                <p className="text-2xl font-bold tabular-nums">{formatPeso(stats.avgTransaction)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">By Payment Method</p>
              <div className="space-y-1">
                {Object.entries(stats.paymentBreakdown).map(([method, total]) => (
                  <div key={method} className="flex justify-between text-sm">
                    <span className="capitalize">{method}</span>
                    <span className="tabular-nums font-medium">{formatPeso(total)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span>Refunded</span>
                  <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400">
                    {stats.refundedCount > 0 ? `-${formatPeso(stats.refundedTotal)}` : formatPeso(0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[240px] justify-start">
                  <CalendarIcon className="size-4 mr-2" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                      </>
                    ) : (
                      format(dateRange.from, 'MMM d, yyyy')
                    )
                  ) : (
                    'Select date range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="maya">Maya</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cashierFilter} onValueChange={setCashierFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Cashier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cashiers</SelectItem>
                {cashiers.map(cashier => (
                  <SelectItem key={cashier.id} value={cashier.id}>
                    {cashier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch('')
                  setPaymentFilter('all')
                  setStatusFilter('all')
                  setCashierFilter('all')
                  setDateRange(undefined)
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedItems.map(txn => {
                const paymentConfig = paymentMethodConfig[txn.paymentType]
                const statusConfig = transactionStatusConfig[txn.status] ?? transactionStatusConfig.completed
                const PaymentIcon = paymentConfig?.icon || Banknote
                return (
                  <TableRow key={txn.id}>
                    <TableCell className="font-mono text-sm">{txn.invoiceNo}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{format(new Date(txn.createdAt), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(txn.createdAt), 'h:mm a')}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getCashierName(txn.cashierId)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{txn.items.length} item{txn.items.length !== 1 ? 's' : ''}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${paymentConfig?.color}`}>
                        <PaymentIcon className="size-3 mr-1" />
                        {paymentConfig?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${statusConfig.color}`}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatPeso(txn.subtotal)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {txn.discount > 0 ? `-${formatPeso(txn.discount)}` : '-'}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${txn.status === 'refunded' ? 'text-muted-foreground line-through' : ''}`}>{formatPeso(txn.total)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setSelectedTransaction(txn)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {pagination.paginatedItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found matching your filters.
            </div>
          )}

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

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-lg">
          {selectedTransaction && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedTransaction.invoiceNo}
                  <Badge className={paymentMethodConfig[selectedTransaction.paymentType]?.color}>
                    {paymentMethodConfig[selectedTransaction.paymentType]?.label}
                  </Badge>
                  <Badge className={transactionStatusConfig[selectedTransaction.status]?.color ?? transactionStatusConfig.completed.color}>
                    {transactionStatusConfig[selectedTransaction.status]?.label ?? selectedTransaction.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {format(new Date(selectedTransaction.createdAt), 'PPP p')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Cashier Info */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Processed by</p>
                  <p className="font-medium">{getCashierName(selectedTransaction.cashierId)}</p>
                </div>

                {/* Items */}
                <div>
                  <p className="text-sm font-medium mb-2">Items</p>
                  <div className="space-y-2">
                    {selectedTransaction.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.productName}
                        </span>
                        <span className="tabular-nums">{formatPeso(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatPeso(selectedTransaction.subtotal)}</span>
                  </div>
                  {selectedTransaction.discount > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Discount</span>
                      <span className="tabular-nums">-{formatPeso(selectedTransaction.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className={`tabular-nums ${selectedTransaction.status === 'refunded' ? 'text-muted-foreground line-through' : ''}`}>{formatPeso(selectedTransaction.total)}</span>
                  </div>
                </div>

                {selectedTransaction.status === 'completed' && (
                  <Button
                    variant="outline"
                    className="w-full text-amber-600 border-amber-500/30 hover:text-amber-700"
                    onClick={() => setRefundTarget(selectedTransaction)}
                  >
                    <Undo2 className="size-4 mr-2" />
                    Refund And Restore Stock
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!refundTarget} onOpenChange={(open) => !open && !isRefunding && setRefundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {refundTarget
                ? `This will mark ${refundTarget.invoiceNo} as refunded and return its sold quantities back to inventory.`
                : 'This will mark the selected transaction as refunded and restore inventory.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRefunding}>Keep Transaction</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefund} disabled={isRefunding}>
              {isRefunding ? 'Refunding...' : 'Confirm Refund'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
