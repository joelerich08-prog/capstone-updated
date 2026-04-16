'use client'

import { useMemo, useState } from 'react'
import { Fragment } from 'react'
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
import { Search, Package, ArrowRight, AlertTriangle, Box, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePagination } from '@/hooks/use-pagination'
import { TablePagination } from '@/components/shared/table-pagination'

type InventoryWithProduct = InventoryLevel & {
  product: Product
  totalStock: number
  isLowStock: boolean
  isOutOfStock: boolean
}

type VariantInventoryWithProduct = InventoryWithProduct & {
  variantName: string
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
  const { inventoryLevels, getInventory, updateInventoryConversion } = useInventory()
  const { products, categories } = useProducts()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({})
  const [editingConversionId, setEditingConversionId] = useState<string | null>(null)
  const [conversionForm, setConversionForm] = useState({ pcsPerPack: 1, packsPerBox: 1 })
  const [isSavingConversion, setIsSavingConversion] = useState(false)

  const calculateTotalUnits = (inventory?: InventoryLevel) => {
    if (!inventory) {
      return 0
    }

    const pcsPerPack = inventory.pcsPerPack > 0 ? inventory.pcsPerPack : 1
    const packsPerBox = inventory.packsPerBox > 0 ? inventory.packsPerBox : 1

    return (
      inventory.wholesaleQty * packsPerBox * pcsPerPack +
      inventory.retailQty * pcsPerPack +
      inventory.shelfQty
    )
  }

  const buildInventoryRow = (
    product: Product,
    inventory: InventoryLevel | undefined,
    variantName?: string,
    variantId?: string,
  ): InventoryWithProduct | VariantInventoryWithProduct => {
    const totalStock = calculateTotalUnits(inventory)
    const reorderLevel = inventory?.reorderLevel ?? 0

    return {
      id: inventory?.id ?? `${product.id}::${variantId ?? 'base'}::stock-overview`,
      productId: product.id,
      variantId,
      wholesaleQty: inventory?.wholesaleQty ?? 0,
      retailQty: inventory?.retailQty ?? 0,
      shelfQty: inventory?.shelfQty ?? 0,
      wholesaleUnit: inventory?.wholesaleUnit ?? 'box',
      retailUnit: inventory?.retailUnit ?? 'pack',
      shelfUnit: inventory?.shelfUnit ?? 'pack',
      pcsPerPack: inventory?.pcsPerPack ?? 1,
      packsPerBox: inventory?.packsPerBox ?? 1,
      reorderLevel,
      updatedAt: inventory?.updatedAt ?? product.createdAt,
      product,
      totalStock,
      isLowStock: reorderLevel > 0 && totalStock <= reorderLevel && totalStock > 0,
      isOutOfStock: totalStock === 0,
      ...(variantName ? { variantName } : {}),
    }
  }

  const matchesFilters = (
    inv: InventoryWithProduct | VariantInventoryWithProduct,
    searchValue: string,
    categoryValue: string,
    stockValue: string,
  ) => {
    const normalizedSearch = searchValue.toLowerCase()
    const matchesSearch =
      inv.product.name.toLowerCase().includes(normalizedSearch) ||
      inv.product.sku.toLowerCase().includes(normalizedSearch) ||
      ('variantName' in inv && inv.variantName.toLowerCase().includes(normalizedSearch))
    const matchesCategory = categoryValue === 'all' || inv.product.categoryId === categoryValue
    const matchesStock =
      stockValue === 'all' ||
      (stockValue === 'low' && inv.isLowStock) ||
      (stockValue === 'out' && inv.isOutOfStock) ||
      (stockValue === 'ok' && !inv.isLowStock && !inv.isOutOfStock)

    return matchesSearch && matchesCategory && matchesStock
  }

  const inventoryData = useMemo(() => {
    return products.map((product): InventoryWithProduct => {
      const inventory = inventoryLevels.find(
        (level) => level.productId === product.id && !level.variantId,
      )

      return buildInventoryRow(product, inventory) as InventoryWithProduct
    })
  }, [inventoryLevels, products])

  const variantInventoryByProduct = useMemo(() => {
    const inventoryByProduct = new Map<string, VariantInventoryWithProduct[]>()

    products.forEach((product) => {
      if (product.variants.length === 0) {
        return
      }

      const variantRows = product.variants
        .map((variant): VariantInventoryWithProduct => {
          const inventory = getInventory(product.id, variant.id)
          return buildInventoryRow(product, inventory, variant.name, variant.id) as VariantInventoryWithProduct
        })
        .sort((left, right) => left.variantName.localeCompare(right.variantName))

      inventoryByProduct.set(product.id, variantRows)
    })

    return inventoryByProduct
  }, [getInventory, products])

  const filteredData = useMemo(() => {
    return inventoryData.filter((inv) => {
      if (matchesFilters(inv, search, categoryFilter, stockFilter)) {
        return true
      }

      const matchingVariants = (variantInventoryByProduct.get(inv.product.id) ?? []).filter((variantInv) =>
        matchesFilters(variantInv, search, categoryFilter, stockFilter),
      )

      return matchingVariants.length > 0
    })
  }, [categoryFilter, inventoryData, search, stockFilter, variantInventoryByProduct])

  const filteredVariantInventoryByProduct = useMemo(() => {
    const filteredVariants = new Map<string, VariantInventoryWithProduct[]>()

    variantInventoryByProduct.forEach((variantRows, productId) => {
      filteredVariants.set(
        productId,
        variantRows.filter((variantInv) => matchesFilters(variantInv, search, categoryFilter, stockFilter)),
      )
    })

    return filteredVariants
  }, [categoryFilter, search, stockFilter, variantInventoryByProduct])

  const stats = {
    total: inventoryData.length,
    lowStock:
      inventoryData.filter((i) => i.isLowStock).length +
      Array.from(variantInventoryByProduct.values()).flat().filter((i) => i.isLowStock).length,
    outOfStock:
      inventoryData.filter((i) => i.isOutOfStock).length +
      Array.from(variantInventoryByProduct.values()).flat().filter((i) => i.isOutOfStock).length,
  }

  const pagination = usePagination(filteredData, { itemsPerPage: 10 })
  const getCategoryName = (categoryId: string) => {
    return categories.find((category) => category.id === categoryId)?.name ?? 'Unknown'
  }

  const toggleProductVariants = (productId: string) => {
    setExpandedProducts((current) => ({
      ...current,
      [productId]: !current[productId],
    }))
  }

  const startConversionEdit = (inv: InventoryWithProduct | VariantInventoryWithProduct) => {
    setEditingConversionId(inv.id)
    setConversionForm({
      pcsPerPack: inv.pcsPerPack,
      packsPerBox: inv.packsPerBox,
    })
  }

  const cancelConversionEdit = () => {
    setEditingConversionId(null)
  }

  const saveConversionEdit = async (inv: InventoryWithProduct | VariantInventoryWithProduct) => {
    if (conversionForm.pcsPerPack <= 0 || conversionForm.packsPerBox <= 0) {
      return
    }

    setIsSavingConversion(true)
    const result = await updateInventoryConversion(
      inv.productId,
      inv.variantId,
      conversionForm.pcsPerPack,
      conversionForm.packsPerBox,
    )
    setIsSavingConversion(false)

    if (result.success) {
      setEditingConversionId(null)
    }
  }

  const renderInventoryRow = (inv: InventoryWithProduct | VariantInventoryWithProduct, isVariant = false) => (
    <TableRow key={isVariant ? `${inv.productId}-${inv.variantId}` : inv.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          {!isVariant && inv.product.variants.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => toggleProductVariants(inv.product.id)}
              title={expandedProducts[inv.product.id] ? 'Hide variants' : 'Show variants'}
            >
              {expandedProducts[inv.product.id] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
          ) : (
            <span className={`${isVariant ? 'ml-9' : 'ml-0'} flex items-center`}>
              <Package className={`size-4 text-muted-foreground ${isVariant ? 'opacity-60' : ''}`} />
            </span>
          )}
          <div>
            <div className={`font-medium ${isVariant ? 'text-sm' : ''}`}>
              {isVariant ? (inv as VariantInventoryWithProduct).variantName : inv.product.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {isVariant ? `Variant of ${inv.product.name}` : getCategoryName(inv.product.categoryId)}
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
          {editingConversionId === inv.id ? (
            <div className="grid gap-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex flex-col items-center gap-1">
                  <label className="text-xs text-muted-foreground">Pcs / pack</label>
                  <Input
                    type="number"
                    min={1}
                    value={conversionForm.pcsPerPack}
                    onChange={(e) => setConversionForm((current) => ({
                      ...current,
                      pcsPerPack: Number(e.target.value),
                    }))}
                    className="w-24 text-center"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-xs text-muted-foreground">Packs / box</label>
                  <Input
                    type="number"
                    min={1}
                    value={conversionForm.packsPerBox}
                    onChange={(e) => setConversionForm((current) => ({
                      ...current,
                      packsPerBox: Number(e.target.value),
                    }))}
                    className="w-24 text-center"
                  />
                </div>
              </div>
              <div className="flex justify-center gap-2">
                <Button size="sm" onClick={() => saveConversionEdit(inv)} disabled={isSavingConversion}>
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={cancelConversionEdit} disabled={isSavingConversion}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1.5">
                <Box className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium tabular-nums">
                  1 {inv.wholesaleUnit}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                = {inv.packsPerBox} {inv.retailUnit}
                {inv.packsPerBox === 1 ? '' : 's'}
              </span>
              <span className="text-xs text-muted-foreground">
                {inv.pcsPerPack} pcs / {inv.retailUnit}
              </span>
              <Button size="sm" variant="outline" type="button" onClick={() => startConversionEdit(inv)}>
                Edit
              </Button>
            </div>
          )}
        </TableCell>
      )}
      <TableCell className="text-center">
        <div className="flex flex-col items-center">
          <span className="font-bold tabular-nums">{inv.totalStock}</span>
          <span className="text-xs text-muted-foreground">units</span>
        </div>
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
          {!isVariant && (
            <Button variant="ghost" size="icon" className="size-8" asChild>
              <Link href={`${productHrefPrefix}/products?productId=${inv.product.id}&view=1`}>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </TableCell>
      )}
    </TableRow>
  )

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
                      <span>Wholesale to Retail</span>
                      <span className="text-xs font-normal text-muted-foreground">(conversion)</span>
                    </div>
                  </TableHead>
                )}
                <TableHead className="text-center">
                  <div className="flex flex-col items-center">
                    <span>Total</span>
                    <span className="text-xs font-normal text-muted-foreground">(units)</span>
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                {showActions && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedItems.map((inv) => (
                <Fragment key={inv.id}>
                  {renderInventoryRow(inv)}
                  {expandedProducts[inv.product.id] &&
                    (filteredVariantInventoryByProduct.get(inv.product.id) ?? []).map((variantInv) =>
                      renderInventoryRow(variantInv, true),
                    )}
                </Fragment>
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
