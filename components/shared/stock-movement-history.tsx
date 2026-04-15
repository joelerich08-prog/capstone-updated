'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiFetch } from '@/lib/api-client'
import type { MovementType, InventoryTier, StockMovement } from '@/lib/types'
import {
  Search,
  ArrowDownToLine,
  ArrowRightLeft,
  Scissors,
  ShoppingCart,
  ClipboardEdit,
  AlertTriangle,
  RotateCcw,
  Download,
  Filter,
} from 'lucide-react'
import { format } from 'date-fns'
import { usePagination } from '@/hooks/use-pagination'
import { TablePagination } from '@/components/shared/table-pagination'

type StockMovementApiRow = Omit<StockMovement, 'createdAt'> & {
  createdAt: string
}

type ParsedAllocationNotes = {
  referenceType: string
  referenceId: string
  allocations: Array<{
    batchId: string
    batchNumber: string
    quantity: number
  }>
}

const movementTypeConfig: Record<MovementType, { label: string; icon: React.ReactNode; color: string }> = {
  receive: { label: 'Received', icon: <ArrowDownToLine className="size-4" />, color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30' },
  breakdown: { label: 'Breakdown', icon: <Scissors className="size-4" />, color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30' },
  transfer: { label: 'Transfer', icon: <ArrowRightLeft className="size-4" />, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  sale: { label: 'Sale', icon: <ShoppingCart className="size-4" />, color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30' },
  adjustment: { label: 'Adjustment', icon: <ClipboardEdit className="size-4" />, color: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30' },
  damage: { label: 'Damage', icon: <AlertTriangle className="size-4" />, color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30' },
  return: { label: 'Return', icon: <RotateCcw className="size-4" />, color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' },
}

const tierLabels: Record<InventoryTier, string> = {
  wholesale: 'Wholesale',
  retail: 'Retail',
  shelf: 'Shelf',
}

const slugifyFilenamePart = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const parseAllocationNotes = (notes?: string): ParsedAllocationNotes | null => {
  if (!notes) {
    return null
  }

  try {
    const parsed = JSON.parse(notes) as ParsedAllocationNotes
    if (!parsed || !Array.isArray(parsed.allocations)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

const formatMovementNotes = (movement: StockMovement) => {
  const parsed = parseAllocationNotes(movement.notes)
  if (!parsed || parsed.allocations.length === 0) {
    return movement.notes ?? ''
  }

  const allocationSummary = parsed.allocations
    .map((allocation) => `${allocation.batchNumber}: ${allocation.quantity}`)
    .join(', ')

  const label = movement.movementType === 'return' ? 'Restored batches' : 'Batches'
  return `${label}: ${allocationSummary}`
}

export function StockMovementHistory() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')

  const productIdFilter = searchParams.get('productId')
  const variantIdFilter = searchParams.get('variantId')
  const variantNameFilter = searchParams.get('variantName')
  const productNameFilter = searchParams.get('productName')

  useEffect(() => {
    let isMounted = true

    const fetchMovements = async () => {
      try {
        setIsLoading(true)
        const data = await apiFetch<StockMovementApiRow[]>('/api/inventory/get_movements.php')
        if (!isMounted) {
          return
        }

        setMovements(
          data.map((movement) => ({
            ...movement,
            createdAt: new Date(movement.createdAt),
          })),
        )
      } catch (error) {
        console.error('Failed to load stock movements:', error)
        if (isMounted) {
          setMovements([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchMovements()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const searchTarget = `${movement.productName} ${movement.variantName ?? ''} ${movement.reason ?? ''} ${movement.notes ?? ''} ${movement.performedBy}`.toLowerCase()
      const matchesSearch = searchTarget.includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === 'all' || movement.movementType === typeFilter
      const matchesProduct = !productIdFilter || movement.productId === productIdFilter
      const matchesVariant = !variantIdFilter || movement.variantId === variantIdFilter
      const matchesTier =
        tierFilter === 'all' ||
        movement.fromTier === tierFilter ||
        movement.toTier === tierFilter

      return matchesSearch && matchesType && matchesTier && matchesProduct && matchesVariant
    })
  }, [movements, productIdFilter, searchQuery, tierFilter, typeFilter, variantIdFilter])

  const pagination = usePagination(filteredMovements, { itemsPerPage: 10 })

  const stats = {
    received: movements.filter((m) => m.movementType === 'receive').reduce((sum, m) => sum + m.quantity, 0),
    breakdown: movements.filter((m) => m.movementType === 'breakdown').length,
    transfers: movements.filter((m) => m.movementType === 'transfer').length,
    sales: movements.filter((m) => m.movementType === 'sale').reduce((sum, m) => sum + m.quantity, 0),
  }

  const handleExport = () => {
    const header = 'ID,Product,Movement Type,From Tier,To Tier,Quantity,Reason,Notes,Performed By,Date'

    const rows = filteredMovements
      .map((movement) => {
        const fromTier = movement.fromTier ? tierLabels[movement.fromTier] : ''
        const toTier = movement.toTier ? tierLabels[movement.toTier] : ''
        const reason = movement.reason ? `"${movement.reason.replace(/"/g, '""')}"` : ''
        const notesText = formatMovementNotes(movement)
        const notes = notesText ? `"${notesText.replace(/"/g, '""')}"` : ''
        const productName = `"${movement.productName.replace(/"/g, '""')}"`

        return `${movement.id},${productName},${getMovementConfig(movement.movementType).label},${fromTier},${toTier},${movement.quantity},${reason},${notes},${movement.performedBy},${format(movement.createdAt, 'yyyy-MM-dd HH:mm')}`
      })
      .join('\n')

    const csv = `${header}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const filenameParts = ['stock-movements']
    if (productNameFilter) {
      const productSlug = slugifyFilenamePart(productNameFilter)
      if (productSlug) {
        filenameParts.push(productSlug)
      }
    }
    if (variantNameFilter) {
      const variantSlug = slugifyFilenamePart(variantNameFilter)
      if (variantSlug) {
        filenameParts.push(variantSlug)
      }
    }
    filenameParts.push(format(new Date(), 'yyyy-MM-dd'))
    link.download = `${filenameParts.join('-')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-green-500/10">
                <ArrowDownToLine className="size-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.received.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Receive Qty (Raw)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-orange-500/10">
                <Scissors className="size-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.breakdown}</p>
                <p className="text-sm text-muted-foreground">Breakdowns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-blue-500/10">
                <ArrowRightLeft className="size-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.transfers}</p>
                <p className="text-sm text-muted-foreground">Transfers</p>
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
                <p className="text-2xl font-bold tabular-nums">{stats.sales.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Sale Qty (Raw)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          {(productIdFilter || variantIdFilter) && (
            <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <div className="text-sm">
                Showing movements for <span className="font-medium">{productNameFilter || 'selected product'}</span>
                {variantIdFilter && (
                  <span className="text-muted-foreground"> / {variantNameFilter || 'selected variant'}</span>
                )}
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={pathname}>Clear Filter</Link>
              </Button>
            </div>
          )}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap gap-4">
              <div className="relative min-w-[200px] max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products or users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="mr-2 size-4" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(movementTypeConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="shelf">Shelf</SelectItem>
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
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Movement</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading movement history...
                    </TableCell>
                  </TableRow>
                ) : pagination.paginatedItems.length > 0 ? (
                  pagination.paginatedItems.map((movement) => {
                    const config = getMovementConfig(movement.movementType)
                    const isNegativeAdjustment = movement.movementType === 'adjustment' && movement.quantity < 0
                    const displayQuantity = movement.movementType === 'adjustment'
                      ? Math.abs(movement.quantity)
                      : movement.quantity
                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="text-sm">
                          <div>{format(movement.createdAt, 'MMM d, yyyy')}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(movement.createdAt, 'h:mm a')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{movement.productName}</div>
                          {movement.variantName && (
                            <div className="text-xs text-muted-foreground">{movement.variantName}</div>
                          )}
                          {movement.reason && (
                            <div className="text-xs text-muted-foreground">{movement.reason}</div>
                          )}
                          {movement.notes && (
                            <div className="text-xs text-muted-foreground">{formatMovementNotes(movement)}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={config.color}>
                            <span className="mr-1">{config.icon}</span>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {movement.fromTier && movement.toTier ? (
                            <span>
                              {tierLabels[movement.fromTier]} -&gt; {tierLabels[movement.toTier]}
                            </span>
                          ) : movement.toTier ? (
                            <span>-&gt; {tierLabels[movement.toTier]}</span>
                          ) : movement.fromTier ? (
                            <span>{tierLabels[movement.fromTier]} -&gt;</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-medium tabular-nums ${isNegativeAdjustment ? 'text-red-600 dark:text-red-400' : movement.movementType === 'adjustment' ? 'text-green-600 dark:text-green-400' : ''}`}>
                          {movement.movementType === 'adjustment' && movement.quantity > 0 ? '+' : ''}
                          {displayQuantity}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {movement.performedBy}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No movements found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && filteredMovements.length > 0 && (
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
          )}
        </CardContent>
      </Card>
    </>
  )
}

const getMovementConfig = (movementType: string) =>
  movementTypeConfig[movementType as MovementType] ?? {
    label: movementType,
    icon: <ClipboardEdit className="size-4" />,
    color: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',
  }
