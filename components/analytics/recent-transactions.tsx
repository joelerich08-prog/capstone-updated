'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTransactions } from '@/contexts/transaction-context'
import { formatPeso } from '@/lib/utils/currency'
import { formatDistanceToNow } from 'date-fns'

interface RecentTransactionsProps {
  limit?: number
}

export function RecentTransactions({ limit = 5 }: RecentTransactionsProps) {
  const { transactions: allTransactions } = useTransactions()
  const transactions = allTransactions.slice(0, limit)

  const getPaymentBadgeVariant = (type: string) => {
    switch (type) {
      case 'cash':
        return 'secondary'
      case 'gcash':
        return 'default'
      case 'maya':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'refunded':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      case 'cancelled':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      default:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Latest sales transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{tx.invoiceNo}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPaymentBadgeVariant(tx.paymentType)} className="text-xs capitalize">
                      {tx.paymentType}
                    </Badge>
                    <Badge className={`text-xs ${getStatusBadgeClass(tx.status)}`}>
                      {tx.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {tx.items.length} item{tx.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium tabular-nums ${tx.status === 'refunded' ? 'text-muted-foreground line-through' : ''}`}>{formatPeso(tx.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(tx.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[220px] items-center justify-center text-center text-sm text-muted-foreground">
            No transactions have been recorded yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
