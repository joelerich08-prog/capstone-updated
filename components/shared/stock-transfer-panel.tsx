'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useProducts } from '@/contexts/products-context'
import { useInventory } from '@/contexts/inventory-context'
import { useAuth } from '@/contexts/auth-context'
import { ArrowRight, Package, Store, Warehouse, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const BASE_PRODUCT_VALUE = '__base__'

export function StockTransferPanel() {
  const { inventoryLevels, getInventory, transferStock } = useInventory()
  const { user } = useAuth()
  const { products } = useProducts()
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const inventory = selectedProduct ? getInventory(selectedProduct, selectedVariant || undefined) : null
  const product = selectedProduct
    ? products.find((p) => p.id === selectedProduct)
    : null
  const selectedProductVariants = product?.variants ?? []
  const requiresVariantSelection = selectedProductVariants.length > 0
  const hasBaseInventoryRow = selectedProduct
    ? inventoryLevels.some((level) => level.productId === selectedProduct && !level.variantId)
    : false

  const handleTransferClick = () => {
    if (requiresVariantSelection && !selectedVariant) {
      toast.error('Please select a variant for this product')
      return
    }

    if (!selectedProduct || !inventory || quantity <= 0) {
      toast.error('Please select a product and quantity')
      return
    }

    if (quantity > inventory.retailQty) {
      toast.error('Not enough retail stock to transfer')
      return
    }

    setIsConfirmOpen(true)
  }

  const handleConfirmTransfer = async () => {
    if (!selectedProduct || !inventory) return

    const userName = user?.name || 'Unknown User'
    const result = await transferStock(selectedProduct, 'retail', 'shelf', quantity, userName, selectedVariant || undefined)

    if (result.success) {
      toast.success(`Transfer complete: ${quantity} ${inventory.retailUnit}(s) moved to shelf`)
      setSelectedProduct('')
      setSelectedVariant('')
      setQuantity(1)
    } else {
      toast.error(result.error || 'Transfer failed')
    }
    setIsConfirmOpen(false)
  }

  const productsWithRetailStock = products.filter((prod) => {
    const totalRetail = inventoryLevels
      .filter((i) => i.productId === prod.id)
      .reduce((sum, level) => sum + level.retailQty, 0)
    return totalRetail > 0
  })

  const lowShelfProducts = inventoryLevels
    .filter((inv) => inv.shelfQty <= inv.reorderLevel && inv.retailQty > 0)
    .map((inv) => ({
      ...inv,
      product: products.find((p) => p.id === inv.productId),
    }))
    .filter((item) => item.product)

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Transfer to Shelf</CardTitle>
          <CardDescription>Move retail packs from storage to the store shelf</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel>Select Product</FieldLabel>
              <Select value={selectedProduct} onValueChange={(value) => {
                  setSelectedProduct(value)
                  setSelectedVariant('')
                }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {productsWithRetailStock.map((prod) => {
                    const totalRetail = inventoryLevels
                      .filter((i) => i.productId === prod.id)
                      .reduce((sum, level) => sum + level.retailQty, 0)
                    return (
                      <SelectItem key={prod.id} value={prod.id}>
                        {prod.name} ({totalRetail} packs available)
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>

              {selectedProduct && selectedProductVariants.length > 0 ? (
                <Field>
                  <FieldLabel>Variant</FieldLabel>
                  <Select
                    value={selectedVariant || (hasBaseInventoryRow ? BASE_PRODUCT_VALUE : '')}
                    onValueChange={(value) => setSelectedVariant(value === BASE_PRODUCT_VALUE ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {hasBaseInventoryRow ? <SelectItem value={BASE_PRODUCT_VALUE}>Base product</SelectItem> : null}
                      {selectedProductVariants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.name}{variant.sku ? ` (${variant.sku})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}

            <Field>
              <FieldLabel>
                Quantity (Packs)
                {inventory && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (Available: {inventory.retailQty} {inventory.retailUnit}s)
                  </span>
                )}
              </FieldLabel>
              <Input
                type="number"
                min={1}
                max={inventory?.retailQty || 1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                disabled={!selectedProduct}
              />
            </Field>
          </FieldGroup>

          {inventory && product && (
            <>
              <Separator />
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="mb-3 text-sm text-muted-foreground">Transfer Preview</p>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-lg border bg-background">
                      <Warehouse className="size-7" />
                    </div>
                    <p className="font-bold tabular-nums">{inventory.retailQty - quantity}</p>
                    <p className="text-xs text-muted-foreground">Retail Stock ({inventory.retailUnit}s)</p>
                    <p className="text-xs text-destructive">-{quantity}</p>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <ArrowRight className="size-6 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {quantity} {inventory.retailUnit}(s)
                    </span>
                  </div>

                  <div className="text-center">
                    <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                      <Store className="size-7 text-primary" />
                    </div>
                    <p className="font-bold tabular-nums text-primary">{inventory.shelfQty + quantity}</p>
                    <p className="text-xs text-muted-foreground">Shelf Stock ({inventory.shelfUnit}s)</p>
                    <p className="text-xs text-green-600 dark:text-green-400">+{quantity}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <Button
            className="w-full"
            onClick={handleTransferClick}
            disabled={!selectedProduct || quantity <= 0 || (requiresVariantSelection && !selectedVariant)}
          >
            <ArrowRight className="mr-2 size-4" />
            Confirm Transfer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-orange-500" />
            Needs Replenishment
          </CardTitle>
          <CardDescription>Products with low shelf stock</CardDescription>
        </CardHeader>
        <CardContent>
          {lowShelfProducts.length > 0 ? (
            <div className="space-y-3">
              {lowShelfProducts.map((item) => {
                if (!item.product) return null
                return (
                  <div
                    key={item.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg bg-muted/50 p-2 transition-colors hover:bg-muted"
                    onClick={() => {
                      setSelectedProduct(item.productId)
                      setSelectedVariant(item.variantId || '')
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Package className="size-4 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">{item.product.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.shelfQty === 0 ? (
                        <Badge variant="destructive" className="text-xs">Out</Badge>
                      ) : (
                        <Badge className="border-orange-500/20 bg-orange-500/10 text-xs text-orange-600 dark:text-orange-400">
                          {item.shelfQty}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="mx-auto mb-2 size-8 opacity-50" />
              <p className="text-sm">All shelves are well stocked</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Stock Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              {inventory && (
                <>
                  You are about to transfer <strong>{quantity} {inventory.retailUnit}(s)</strong> to the store shelf.
                  <br /><br />
                  This will move stock from retail storage to the store shelf. Do you want to proceed?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransfer}>
              Confirm Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
