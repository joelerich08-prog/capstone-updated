'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { useProducts } from '@/contexts/products-context'
import { useInventory } from '@/contexts/inventory-context'
import { useAuth } from '@/contexts/auth-context'
import { ArrowDown, Boxes, Package, PackageOpen } from 'lucide-react'
import { toast } from 'sonner'

export function StockBreakdownPanel() {
  const { inventoryLevels, breakdownStock } = useInventory()
  const { user } = useAuth()
  const { products } = useProducts()
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const inventory = selectedProduct
    ? inventoryLevels.find((inv) => inv.productId === selectedProduct)
    : null
  const product = selectedProduct
    ? products.find((p) => p.id === selectedProduct)
    : null
  const breakableProducts = products.filter((prod) => {
    const currentInventory = inventoryLevels.find((level) => level.productId === prod.id)
    return currentInventory && currentInventory.wholesaleQty > 0 && currentInventory.packsPerBox > 0
  })

  const handleBreakdownClick = () => {
    if (!selectedProduct || !inventory || quantity <= 0) {
      toast.error('Please select a product and quantity')
      return
    }

    if (quantity > inventory.wholesaleQty) {
      toast.error('Not enough wholesale stock')
      return
    }

    if (inventory.packsPerBox <= 0) {
      toast.error('This product does not have a valid box-to-pack conversion')
      return
    }

    setIsConfirmOpen(true)
  }

  const handleConfirmBreakdown = async () => {
    if (!selectedProduct || !inventory) return

    const userName = user?.name || 'Unknown User'
    const result = await breakdownStock(selectedProduct, quantity, userName)

    if (result.success) {
      toast.success(
        `Breakdown complete: ${quantity} ${inventory.wholesaleUnit}(s) -> ${result.unitsProduced} ${inventory.retailUnit}(s)`
      )
      setQuantity(1)
      setSelectedProduct('')
    } else {
      toast.error(result.error || 'Breakdown failed')
    }
    setIsConfirmOpen(false)
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Breakdown Stock</CardTitle>
            <CardDescription>Convert wholesale boxes to retail packs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel>Select Product</FieldLabel>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {breakableProducts.map((prod) => (
                      <SelectItem key={prod.id} value={prod.id}>
                        {prod.name} ({prod.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>
                  Quantity to Breakdown (Boxes)
                  {inventory && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (Available: {inventory.wholesaleQty})
                    </span>
                  )}
                </FieldLabel>
                <Input
                  type="number"
                  min={1}
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
                  <p className="mb-3 text-sm text-muted-foreground">Breakdown Preview</p>

                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg border bg-background">
                        <Boxes className="size-6" />
                      </div>
                      <p className="font-bold tabular-nums">{quantity}</p>
                      <p className="text-xs text-muted-foreground">{inventory.wholesaleUnit}(s)</p>
                    </div>

                    <ArrowDown className="size-6 text-primary" />

                    <div className="text-center">
                      <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                        <PackageOpen className="size-6 text-primary" />
                      </div>
                      <p className="font-bold tabular-nums text-primary">
                        {quantity * inventory.packsPerBox}
                      </p>
                      <p className="text-xs text-muted-foreground">{inventory.retailUnit}(s)</p>
                    </div>
                  </div>

                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Conversion: 1 {inventory.wholesaleUnit} = {inventory.packsPerBox}{' '}
                    {inventory.retailUnit}s
                  </p>
                </div>
              </>
            )}

            <Button
              className="w-full"
              onClick={handleBreakdownClick}
              disabled={!selectedProduct || quantity <= 0}
            >
              <Package className="mr-2 size-4" />
              Confirm Breakdown
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Stock</CardTitle>
            <CardDescription>
              {product ? product.name : 'Select a product to view stock'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inventory ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <Boxes className="mx-auto mb-2 size-6 text-muted-foreground" />
                    <p className="text-2xl font-bold tabular-nums">{inventory.wholesaleQty}</p>
                    <p className="text-xs text-muted-foreground">
                      Wholesale ({inventory.wholesaleUnit}s)
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <Package className="mx-auto mb-2 size-6 text-muted-foreground" />
                    <p className="text-2xl font-bold tabular-nums">{inventory.retailQty}</p>
                    <p className="text-xs text-muted-foreground">
                      Retail ({inventory.retailUnit}s)
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <PackageOpen className="mx-auto mb-2 size-6 text-muted-foreground" />
                    <p className="text-2xl font-bold tabular-nums">{inventory.shelfQty}</p>
                    <p className="text-xs text-muted-foreground">Shelf (packs)</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Packs per Box</span>
                    <span className="font-medium">{inventory.packsPerBox}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Units per Pack</span>
                    <span className="font-medium">{inventory.pcsPerPack}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reorder Level</span>
                    <span className="font-medium">{inventory.reorderLevel} packs</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Package className="mx-auto mb-4 size-12 opacity-50" />
                <p>Select a product to view stock levels</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Stock Breakdown</AlertDialogTitle>
            <AlertDialogDescription>
              {inventory && (
                <>
                  You are about to break down <strong>{quantity} {inventory.wholesaleUnit}(s)</strong>{' '}
                  into <strong>{quantity * inventory.packsPerBox} {inventory.retailUnit}(s)</strong>.
                  <br />
                  <br />
                  This action will update the stock levels accordingly. Do you want to proceed?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBreakdown}>
              Confirm Breakdown
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
