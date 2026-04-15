'use client'

import { useState } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { useProducts } from '@/contexts/products-context'
import { useInventory } from '@/contexts/inventory-context'
import { useAuth } from '@/contexts/auth-context'
import { formatCurrency } from '@/lib/utils/currency'
import { generateBatchNumber } from '@/lib/mock-data/batches'
import { Truck, Plus, Trash2, Check, Calendar, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays, differenceInDays } from 'date-fns'

interface ReceiveItem {
  productId: string
  variantId?: string
  productName: string
  variantName?: string
  quantity: number
  tier: 'wholesale' | 'retail'
  unitCost: number
  batchNumber: string
  expirationDate: Date
  manufacturingDate?: Date
}

interface ReceiveHistory {
  id: string
  date: Date
  supplier: string
  items: number
  totalCost: number
  status: 'completed' | 'pending'
}

const BASE_PRODUCT_VALUE = '__base__'

const initialReceiveHistory: ReceiveHistory[] = [
  {
    id: 'rcv_001',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
    supplier: 'Metro Distributors Inc.',
    items: 5,
    totalCost: 12500,
    status: 'completed',
  },
  {
    id: 'rcv_002',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    supplier: 'Golden Harvest Trading',
    items: 8,
    totalCost: 28000,
    status: 'completed',
  },
  {
    id: 'rcv_003',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48),
    supplier: 'Pacific Beverage Co.',
    items: 3,
    totalCost: 15600,
    status: 'completed',
  },
]

export function ReceiveStockPanel() {
  const { products, suppliers } = useProducts()
  const { inventoryLevels, receiveStock } = useInventory()
  const { user } = useAuth()
  const [receiveHistory, setReceiveHistory] = useState<ReceiveHistory[]>(initialReceiveHistory)
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [tier, setTier] = useState<'wholesale' | 'retail'>('wholesale')
  const [unitCost, setUnitCost] = useState<number>(0)
  const [notes, setNotes] = useState<string>('')
  const [items, setItems] = useState<ReceiveItem[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState<string>(`INV-${Date.now()}`)
  const [batchNumber, setBatchNumber] = useState<string>(generateBatchNumber())
  const [expirationDate, setExpirationDate] = useState<string>(format(addDays(new Date(), 180), 'yyyy-MM-dd'))
  const [manufacturingDate, setManufacturingDate] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const selectedProductRecord = products.find((p) => p.id === selectedProduct)
  const selectedProductVariants = selectedProductRecord?.variants ?? []
  const requiresVariantSelection = selectedProductVariants.length > 0
  const hasBaseInventoryRow = selectedProduct
    ? inventoryLevels.some((level) => level.productId === selectedProduct && !level.variantId)
    : false

  const handleAddItem = () => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier first')
      return
    }

    if (!selectedProduct || quantity <= 0) {
      toast.error('Please select a product and enter a valid quantity')
      return
    }

    if (!expirationDate) {
      toast.error('Please enter an expiration date')
      return
    }

    const product = selectedProductRecord
    if (!product) return

    if (requiresVariantSelection && !selectedVariant) {
      toast.error('Please select a variant for this product')
      return
    }

    const expDate = new Date(expirationDate)
    const today = new Date()
    const daysUntilExpiry = differenceInDays(expDate, new Date())

    if (daysUntilExpiry <= 0) {
      toast.error('Expiration date must be in the future')
      return
    }

    if (!batchNumber.trim()) {
      toast.error('Batch number is required')
      return
    }

    const parsedUnitCost = unitCost || product.costPrice
    if (parsedUnitCost < 0) {
      toast.error('Unit cost cannot be negative')
      return
    }

    if (manufacturingDate) {
      const mfgDate = new Date(manufacturingDate)
      if (mfgDate > today) {
        toast.error('Manufacturing date cannot be in the future')
        return
      }
      if (mfgDate >= expDate) {
        toast.error('Manufacturing date must be before the expiration date')
        return
      }
    }

    if (daysUntilExpiry <= 30) {
      toast.warning('Warning: Product expires in less than 30 days')
    }

    const variant = product.variants.find((v) => v.id === selectedVariant)
    const variantLabel = variant?.name

    const existingIndex = items.findIndex(
      (item) =>
        item.productId === selectedProduct &&
        item.variantId === variant?.id &&
        item.tier === tier &&
        item.batchNumber === batchNumber,
    )

    if (existingIndex >= 0) {
      const updated = [...items]
      updated[existingIndex].quantity += quantity
      setItems(updated)
    } else {
      setItems([
        ...items,
        {
          productId: selectedProduct,
          variantId: variant?.id,
          productName: product.name,
          variantName: variantLabel,
          quantity,
          tier,
          unitCost: parsedUnitCost,
          batchNumber: batchNumber.trim(),
          expirationDate: expDate,
          manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : undefined,
        },
      ])
    }

    setSelectedProduct('')
    setSelectedVariant('')
    setQuantity(1)
    setUnitCost(0)
    setBatchNumber(generateBatchNumber())
    setManufacturingDate('')
    toast.success(`Added ${product.name}${variantLabel ? ` (${variantLabel})` : ''} to receive list`)
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (isSubmitting) {
      return
    }

    if (!selectedSupplier) {
      toast.error('Please select a supplier')
      return
    }
    const trimmedInvoiceNumber = invoiceNumber.trim()

    if (!trimmedInvoiceNumber) {
      toast.error('Invoice number is required')
      return
    }
    if (items.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    const totalCostValue = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
    const supplier = suppliers.find((s) => s.id === selectedSupplier)
    if (!supplier) {
      toast.error('Selected supplier is invalid')
      return
    }
    const userName = user?.name || 'Unknown User'

    const receiveItems = items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      variantName: item.variantName,
      productName: item.productName,
      quantity: item.quantity,
      cost: item.unitCost,
      tier: item.tier,
      batchNumber: item.batchNumber,
      expirationDate: format(item.expirationDate, 'yyyy-MM-dd'),
      manufacturingDate: item.manufacturingDate ? format(item.manufacturingDate, 'yyyy-MM-dd') : undefined,
    }))

    setIsSubmitting(true)
    let result: Awaited<ReturnType<typeof receiveStock>>
    try {
      result = await receiveStock(receiveItems, supplier.id, supplier.name, trimmedInvoiceNumber, userName)
    } finally {
      setIsSubmitting(false)
    }

    if (result.success) {
      const newReceipt: ReceiveHistory = {
        id: `rcv_${Date.now()}`,
        date: new Date(),
        supplier: supplier?.name || 'Unknown Supplier',
        items: items.length,
        totalCost: totalCostValue,
        status: 'completed',
      }

      setReceiveHistory((prev) => [newReceipt, ...prev])
      toast.success(`Received ${items.length} items with batch tracking`)
      setItems([])
      setSelectedSupplier('')
      setSelectedProduct('')
      setSelectedVariant('')
      setQuantity(1)
      setUnitCost(0)
      setNotes('')
      setInvoiceNumber(`INV-${Date.now()}`)
      setBatchNumber(generateBatchNumber())
      setManufacturingDate('')
      setExpirationDate(format(addDays(new Date(), 180), 'yyyy-MM-dd'))
    } else {
      toast.error(result.error || 'Failed to receive stock')
    }
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>New Stock Receipt</CardTitle>
          <CardDescription>Add products received from suppliers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Supplier</FieldLabel>
                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
                  <Field>
                    <FieldLabel>Invoice Number</FieldLabel>
                    <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-2024-001" />
                  </Field>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="mb-4 font-medium">Add Product</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                <FieldLabel>Product</FieldLabel>
                <Select value={selectedProduct} onValueChange={(value) => {
                  setSelectedProduct(value)
                  setSelectedVariant('')
                }}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
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
              <Field>
                <FieldLabel>Stock Tier</FieldLabel>
                <Select value={tier} onValueChange={(v) => setTier(v as 'wholesale' | 'retail')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wholesale">Wholesale (Boxes)</SelectItem>
                    <SelectItem value="retail">Retail (Packs)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Quantity</FieldLabel>
                  <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} />
                </Field>
                <Field>
                  <FieldLabel>Unit Cost (optional)</FieldLabel>
                  <Input type="number" min={0} step={0.01} value={unitCost || ''} onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)} placeholder="Use default cost" />
                </Field>
              </div>
              <div className="rounded-lg border border-dashed p-4 mt-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Batch & Expiry</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Batch/Lot Number</FieldLabel>
                    <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="LOT-2024-001" />
                  </Field>
                  <Field>
                    <FieldLabel>Expiry *</FieldLabel>
                    <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <Field>
                    <FieldLabel>Manufacturing Date (optional)</FieldLabel>
                    <Input type="date" value={manufacturingDate} onChange={(e) => setManufacturingDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} />
                  </Field>
                </div>
              </div>
            </div>

            <Button
              onClick={handleAddItem}
              variant="outline"
              className="w-full"
              disabled={!selectedProduct || quantity <= 0 || (requiresVariantSelection && !selectedVariant)}
            >
              <Plus className="mr-2 size-4" />
              Add to List
            </Button>
          </FieldGroup>

          {items.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    const daysUntilExpiry = differenceInDays(item.expirationDate, new Date())
                    const isExpiringSoon = daysUntilExpiry <= 30
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{item.productName}</span>
                            <Badge variant="secondary" className="ml-2">{item.tier === 'wholesale' ? 'Wholesale' : 'Retail'}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.batchNumber}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={isExpiringSoon ? 'text-orange-600' : ''}>{format(item.expirationDate, 'MMM d, yyyy')}</span>
                            {isExpiringSoon && <AlertTriangle className="size-4 text-orange-500" />}
                          </div>
                          <span className="text-xs text-muted-foreground">{daysUntilExpiry} days</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.quantity * item.unitCost)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <Field>
            <FieldLabel>Notes (optional)</FieldLabel>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes about this delivery..." rows={3} />
          </Field>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Items: <span className="font-medium text-foreground">{totalItems}</span></p>
              <p className="text-lg font-bold">Total: {formatCurrency(totalCost)}</p>
            </div>
            <Button onClick={handleSubmit} disabled={items.length === 0 || !selectedSupplier || !invoiceNumber.trim() || isSubmitting}>
              <Check className="mr-2 size-4" />
              {isSubmitting ? 'Completing...' : 'Complete Receipt'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Receipts</CardTitle>
          <CardDescription>Latest stock deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {receiveHistory.map((receipt) => (
              <div key={receipt.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{receipt.supplier}</span>
                  </div>
                  <Badge variant={receipt.status === 'completed' ? 'default' : 'secondary'}>{receipt.status}</Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{receipt.items} items received</p>
                  <p className="font-medium text-foreground">{formatCurrency(receipt.totalCost)}</p>
                  <p className="text-xs">{format(receipt.date, 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
