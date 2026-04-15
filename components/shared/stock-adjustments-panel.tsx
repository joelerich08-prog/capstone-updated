'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { useProducts } from '@/contexts/products-context'
import { useInventory } from '@/contexts/inventory-context'
import { useAuth } from '@/contexts/auth-context'
import { Plus, Minus, AlertTriangle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { InventoryTier } from '@/lib/types'
import { apiFetch } from '@/lib/api-client'

type AdjustmentType = 'add' | 'subtract'
type AdjustmentReason = 'damage' | 'expiry' | 'theft' | 'correction' | 'other'

interface AdjustmentHistory {
  id: string
  date: Date
  productName: string
  tier: string
  type: AdjustmentType
  quantity: number
  reason: AdjustmentReason
  notes?: string
  performedBy: string
}

const reasonLabels: Record<AdjustmentReason, string> = {
  damage: 'Damaged Goods',
  expiry: 'Expired Products',
  theft: 'Theft/Loss',
  correction: 'Stock Correction',
  other: 'Other',
}

const BASE_PRODUCT_VALUE = '__base__'

export function StockAdjustmentPanel() {
  const { user } = useAuth()
  const { products } = useProducts()
  const { inventoryLevels, getInventory, getStock, adjustStock } = useInventory()

  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [tier, setTier] = useState<InventoryTier>('shelf')
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('subtract')
  const [quantity, setQuantity] = useState<number>(1)
  const [reason, setReason] = useState<AdjustmentReason>('damage')
  const [notes, setNotes] = useState<string>('')
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentHistory[]>([])
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const inventory = selectedProduct ? getInventory(selectedProduct, selectedVariant || undefined) : null
  const product = selectedProduct ? products.find((p) => p.id === selectedProduct) : null
  const selectedProductVariants = product?.variants ?? []
  const requiresVariantSelection = selectedProductVariants.length > 0
  const hasBaseInventoryRow = selectedProduct
    ? inventoryLevels.some((level) => level.productId === selectedProduct && !level.variantId)
    : false
  const isVariantSelectionValid = !requiresVariantSelection || hasBaseInventoryRow || !!selectedVariant
  const currentStock = selectedProduct ? getStock(selectedProduct, tier, selectedVariant || undefined) : 0

  useEffect(() => {
    let isMounted = true

    const loadAdjustmentHistory = async () => {
      try {
        const movements = await apiFetch<Array<{
          id: string
          productName: string
          movementType: string
          fromTier?: string | null
          quantity: number
          reason?: string | null
          performedBy?: string | null
          createdAt: string
        }>>('/api/inventory/get_movements.php')

        if (!isMounted) {
          return
        }

        const history = movements
          .filter(movement => movement.movementType === 'adjustment' && movement.reason && movement.reason in reasonLabels)
          .map(movement => ({
            id: movement.id,
            date: new Date(movement.createdAt),
            productName: movement.productName,
            tier: movement.fromTier || 'shelf',
            type: (movement.quantity >= 0 ? 'add' : 'subtract') as AdjustmentType,
            quantity: Math.abs(movement.quantity),
            reason: movement.reason as AdjustmentReason,
            performedBy: movement.performedBy || 'Unknown User',
          }))

        setAdjustmentHistory(history.slice(0, 10))
      } catch (error) {
        if (isMounted) {
          setAdjustmentHistory([])
        }
      }
    }

    void loadAdjustmentHistory()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmitClick = () => {
    if (!isVariantSelectionValid) {
      toast.error('Please select a variant for this product')
      return
    }

    if (!selectedProduct || quantity <= 0) {
      toast.error('Please select a product and quantity')
      return
    }

    if (adjustmentType === 'subtract' && quantity > currentStock) {
      toast.error('Cannot subtract more than current stock')
      return
    }

    if (!notes.trim()) {
      toast.error('Please provide notes for this adjustment')
      return
    }

    setIsConfirmOpen(true)
  }

  const handleConfirmAdjustment = async () => {
    if (!selectedProduct || !product) return

    const result = await adjustStock(
      selectedProduct,
      tier,
      adjustmentType === 'add' ? quantity : -quantity,
      reason,
      notes.trim(),
      user?.name || 'Unknown User',
      selectedVariant || undefined,
    )

    if (result.success) {
      const newAdjustment: AdjustmentHistory = {
        id: `adj_${Date.now()}`,
        date: new Date(),
        productName: product.name,
        tier,
        type: adjustmentType,
        quantity,
        reason,
        notes: notes.trim(),
        performedBy: user?.name || 'Unknown User',
      }
      setAdjustmentHistory((prev) => [newAdjustment, ...prev].slice(0, 10))

      const action = adjustmentType === 'add' ? 'Added' : 'Removed'
      toast.success(
        `${action} ${quantity} unit(s) ${adjustmentType === 'add' ? 'to' : 'from'} ${product.name}${selectedVariant ? ` (${products
          .find((prod) => prod.id === selectedProduct)
          ?.variants.find((variant) => variant.id === selectedVariant)
          ?.name || ''})` : ''}`,
      )

      setSelectedProduct('')
      setSelectedVariant('')
      setQuantity(1)
      setNotes('')
    } else {
      toast.error(result.error || 'Adjustment failed')
    }

    setIsConfirmOpen(false)
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New Adjustment</CardTitle>
            <CardDescription>Adjust stock levels with proper documentation</CardDescription>
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
                    {products.map((prod) => (
                      <SelectItem key={prod.id} value={prod.id}>
                        {prod.name} ({prod.sku})
                      </SelectItem>
                    ))}
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

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Stock Tier</FieldLabel>
                  <Select value={tier} onValueChange={(v) => setTier(v as InventoryTier)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="shelf">Shelf</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>Adjustment Type</FieldLabel>
                  <Select
                    value={adjustmentType}
                    onValueChange={(v) => setAdjustmentType(v as AdjustmentType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subtract">
                        <span className="flex items-center gap-2">
                          <Minus className="size-4 text-red-500" />
                          Remove Stock
                        </span>
                      </SelectItem>
                      <SelectItem value="add">
                        <span className="flex items-center gap-2">
                          <Plus className="size-4 text-green-500" />
                          Add Stock
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>
                    Quantity
                    {inventory && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (Current: {currentStock})
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

                <Field>
                  <FieldLabel>Reason</FieldLabel>
                  <Select value={reason} onValueChange={(v) => setReason(v as AdjustmentReason)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(reasonLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel>Notes (required)</FieldLabel>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe the reason for this adjustment..."
                  rows={3}
                />
              </Field>
            </FieldGroup>

            {selectedProduct && product && (
              <div
                className={`rounded-lg p-4 ${adjustmentType === 'subtract' ? 'border border-red-500/20 bg-red-500/10' : 'border border-green-500/20 bg-green-500/10'}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  {adjustmentType === 'subtract' ? (
                    <AlertTriangle className="size-5 text-red-500" />
                  ) : (
                    <Plus className="size-5 text-green-500" />
                  )}
                  <span className="font-medium">Adjustment Preview</span>
                </div>
                <p className="text-sm">
                  {adjustmentType === 'subtract' ? 'Removing' : 'Adding'}{' '}
                  <span className="font-bold">{quantity}</span> unit(s){' '}
                  {adjustmentType === 'subtract' ? 'from' : 'to'}{' '}
                  <span className="font-bold">{product.name}</span> ({tier})
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  After adjustment: {adjustmentType === 'subtract' ? currentStock - quantity : currentStock + quantity} units
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSubmitClick}
              disabled={!selectedProduct || quantity <= 0 || !notes.trim() || !isVariantSelectionValid}
              variant={adjustmentType === 'subtract' ? 'destructive' : 'default'}
            >
              <Check className="mr-2 size-4" />
              Confirm Adjustment
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Adjustments</CardTitle>
            <CardDescription>Latest stock changes</CardDescription>
          </CardHeader>
          <CardContent>
            {adjustmentHistory.length > 0 ? (
              <div className="space-y-4">
                {adjustmentHistory.map((adj) => (
                  <div key={adj.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <span className="text-sm font-medium">{adj.productName}</span>
                      <Badge variant={adj.type === 'add' ? 'default' : 'destructive'} className="text-xs">
                        {adj.type === 'add' ? '+' : '-'}{adj.quantity}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-1">
                        <span className="capitalize">{adj.tier}</span>
                        <span className="mx-1">|</span>
                        {reasonLabels[adj.reason]}
                      </p>
                      {adj.notes && <p className="text-xs italic">&quot;{adj.notes}&quot;</p>}
                      <p className="text-xs">
                        {adj.performedBy} | {format(adj.date, 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent stock adjustments found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {adjustmentType === 'subtract' ? 'Confirm Stock Removal' : 'Confirm Stock Addition'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {product && (
                <>
                  You are about to <strong>{adjustmentType === 'subtract' ? 'remove' : 'add'} {quantity} unit(s)</strong>{' '}
                  {adjustmentType === 'subtract' ? 'from' : 'to'} <strong>{product.name}</strong> ({tier} stock).
                  <br /><br />
                  <strong>Reason:</strong> {reasonLabels[reason]}
                  <br />
                  <strong>Notes:</strong> {notes}
                  <br /><br />
                  This action will be logged. Do you want to proceed?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAdjustment}
              className={adjustmentType === 'subtract' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              Confirm {adjustmentType === 'subtract' ? 'Removal' : 'Addition'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
