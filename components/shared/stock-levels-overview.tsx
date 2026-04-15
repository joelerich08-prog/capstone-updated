'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProducts } from '@/contexts/products-context'
import { useInventory } from '@/contexts/inventory-context'
import type { InventoryLevel, Product } from '@/lib/types'
import { Search, Package, ArrowRight, AlertTriangle, Box } from 'lucide-react'
import Link from 'next/link'
import { usePagination } from '@/hooks/use-pagination'
import { TablePagination } from '@/components/shared/table-pagination'

type InventoryWithProduct = InventoryLevel & {
  product: Product
  totalStock: number
  isLowStock: boolean
  isOutOfStock: boolean
}

interface StockLevelsOverviewProps {
  breakdownHref: string
  transferHref: string
  showPackaging?: boolean
  showActions?: boolean
  productHrefPrefix?: string
}

export function StockLevelsOverview({
  breakdownHref,
  transferHref,
  showPackaging = false,
  showActions = false,
  productHrefPrefix = '',
}: StockLevelsOverviewProps) {
  const { inventoryLevels } = useInventory()
  const { products, categories } = useProducts()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('all')

  const inventoryData = useMemo(() => {
    return inventoryLevels
      .map((inv): InventoryWithProduct | null => {
        const product = products.find((p) => p.id === inv.productId)
        if (!product) {
          return null
        }

        return {
          ...inv,
          product,
          totalStock: inv.wholesaleQty + inv.retailQty + inv.shelfQty,
          isLowStock: inv.shelfQty <= inv.reorderLevel && inv.shelfQty > 0,
          isOutOfStock: inv.shelfQty === 0,
        }
      })
      .filter((inv): inv is InventoryWithProduct => inv !== null)
  }, [inventoryLevels, products])

  const filteredData = useMemo(() => {
    return inventoryData.filter((inv) => {
      const matchesSearch =
        inv.product.name.toLowerCase().includes(search.toLowerCase()) ||
        inv.product.sku.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || inv.product.categoryId === categoryFilter
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && inv.isLowStock) ||
        (stockFilter === 'out' && inv.isOutOfStock) ||
        (stockFilter === 'ok' && !inv.isLowStock && !inv.isOutOfStock)

      return matchesSearch && matchesCategory && matchesStock
    })
  }, [inventoryData, search, categoryFilter, stockFilter])

  const stats = {
    total: inventoryData.length,
    lowStock: inventoryData.filter((i) => i.isLowStock).length,
    outOfStock: inventoryData.filter((i) => i.isOutOfStock).length,
  }

  const pagination = usePagination(filteredData, { itemsPerPage: 10 })
  const getCategoryName = (categoryId: string) => {
    return categories.find((category) => category.id === categoryId)?.name ?? 'Unknown'
  }

  return (
    <>
      <div className="grid gap-4 mb-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.lowStock}
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.outOfStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={breakdownHref}>Breakdown</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={transferHref}>Transfer</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="ok">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col items-center">
                    <span>Wholesale</span>
                    <span className="text-xs font-normal text-muted-foreground">(boxes)</span>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col items-center">
                    <span>Retail</span>
                    <span className="text-xs font-normal text-muted-foreground">(packs)</span>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col items-center">
                    <span>Shelf</span>
                    <span className="text-xs font-normal text-muted-foreground">(units)</span>
                  </div>
                </TableHead>
                {showPackaging && (
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center">
                      <span>Packaging</span>
                      <span className="text-xs font-normal text-muted-foreground">(packs/box)</span>
                    </div>
                  </TableHead>
                )}
                <TableHead className="text-center">Total</TableHead>
                <TableHead>Status</TableHead>
                {showActions && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedItems.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="size-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{inv.product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {getCategoryName(inv.product.categoryId)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-medium tabular-nums">{inv.wholesaleQty}</span>
                      <span className="text-xs text-muted-foreground">{inv.wholesaleUnit}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-medium tabular-nums">{inv.retailQty}</span>
                      <span className="text-xs text-muted-foreground">{inv.retailUnit}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span
                        className={`font-medium tabular-nums ${inv.isOutOfStock ? 'text-destructive' : inv.isLowStock ? 'text-orange-600 dark:text-orange-400' : ''}`}
                      >
                        {inv.shelfQty}
                      </span>
                      <span className="text-xs text-muted-foreground">{inv.shelfUnit}</span>
                    </div>
                  </TableCell>
                  {showPackaging && (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Box className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium tabular-nums">
                          {inv.packsPerBox} packs/box
                        </span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    <span className="font-bold tabular-nums">{inv.totalStock}</span>
                  </TableCell>
                  <TableCell>
                    {inv.isOutOfStock ? (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="mr-1 size-3" />
                        Out
                      </Badge>
                    ) : inv.isLowStock ? (
                      <Badge className="border-orange-500/20 bg-orange-500/10 text-xs text-orange-600 dark:text-orange-400">
                        Low ({inv.reorderLevel})
                      </Badge>
                  ) : (
                    <Badge className="border-green-500/20 bg-green-500/10 text-xs text-green-600 dark:text-green-400">
                      OK
                    </Badge>
                  )}
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <Link href={`${productHrefPrefix}/products/${inv.product.id}`}>
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredData.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No products found matching your criteria.
            </div>
          ) : (
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
