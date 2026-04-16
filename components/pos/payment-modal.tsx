'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { useCart } from '@/contexts/cart-context'
import { useInventory } from '@/contexts/inventory-context'
import { useAuth } from '@/contexts/auth-context'
import { useTransactions } from '@/contexts/transaction-context'
import { useSettings } from '@/contexts/settings-context'
import { formatPeso } from '@/lib/utils/currency'
import { toast } from 'sonner'
import type { PaymentType, InventoryTier } from '@/lib/types'
import { Banknote, Smartphone, CreditCard, Check, Printer } from 'lucide-react'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
}

// All available payment methods with their settings keys
const allPaymentMethods: { 
  type: PaymentType
  label: string
  icon: React.ElementType
  settingKey: 'enableCashPayment' | 'enableGCashPayment' | 'enableMayaPayment' | 'enableCardPayment'
}[] = [
  { type: 'cash', label: 'Cash', icon: Banknote, settingKey: 'enableCashPayment' },
  { type: 'gcash', label: 'GCash', icon: Smartphone, settingKey: 'enableGCashPayment' },
  { type: 'maya', label: 'Maya', icon: CreditCard, settingKey: 'enableMayaPayment' },
]

export function PaymentModal({ open, onClose }: PaymentModalProps) {
  const { items, subtotal, discount, total, clearCart } = useCart()
  const { refreshInventory } = useInventory()
  const { user } = useAuth()
  const { addTransaction } = useTransactions()
  const { settings } = useSettings()
  
  // Filter payment methods based on settings
  const enabledPaymentMethods = useMemo(() => {
    return allPaymentMethods.filter(method => settings.pos[method.settingKey])
  }, [settings.pos])
  
  // Default to first enabled payment method
  const defaultPaymentType = enabledPaymentMethods[0]?.type || 'cash'
  
  const [paymentType, setPaymentType] = useState<PaymentType>(defaultPaymentType)
  const [amountReceived, setAmountReceived] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [receipt, setReceipt] = useState<{
    itemsCount: number
    subtotal: number
    discount: number
    total: number
    paymentType: PaymentType
    amountPaid: number
    changeGiven: number
    invoiceNo: string
  } | null>(null)

  const amountTendered = paymentType === 'cash' ? amountReceived : total
  const change = paymentType === 'cash' ? Math.max(0, amountTendered - total) : 0
  const canProceed = paymentType === 'cash' ? amountReceived >= total : true

  const handlePayment = async () => {
    if (!canProceed) {
      toast.error('Insufficient amount received')
      return
    }

    setIsProcessing(true)

    // Simulate payment processing delay for UX
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Generate invoice number before checkout so the backend stores it with the transaction
    const newInvoiceNo = `INV-${String(Date.now()).slice(-6)}`

    const transactionPayload = {
      items: items.map(item => {
        const tier: InventoryTier = item.unitType === 'box'
          ? 'wholesale'
          : item.unitType === 'piece'
            ? 'shelf'
            : 'retail'

        return {
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          tier,
        } as any
      }),
      subtotal,
      discount,
      total,
      paymentType,
      invoiceNo: newInvoiceNo,
    }

    const savedTransaction = await addTransaction(transactionPayload)

    if (!savedTransaction.transaction) {
      setIsProcessing(false)
      toast.error(savedTransaction.error || 'Payment failed while saving transaction. Please try again.')
      return
    }

    const transaction = savedTransaction.transaction
    const amountPaid = paymentType === 'cash' ? amountReceived : total
    const changeGiven = paymentType === 'cash' ? Math.max(0, amountPaid - total) : 0

    setReceipt({
      itemsCount: items.length,
      subtotal,
      discount,
      total,
      paymentType,
      amountPaid,
      changeGiven,
      invoiceNo: transaction.invoiceNo,
    })

    clearCart()
    await refreshInventory()
    setInvoiceNo(transaction.invoiceNo)
    setIsComplete(true)
    setIsProcessing(false)

    toast.success('Payment successful!')
  }

  const handleClose = () => {
    if (isComplete) {
      clearCart()
    }
    setIsComplete(false)
    setAmountReceived(0)
    setPaymentType('cash')
    setInvoiceNo('')
    setReceipt(null)
    onClose()
  }

  const handlePrintReceipt = () => {
    toast.success('Receipt sent to printer')
  }

  // Quick amount buttons for cash
  const quickAmounts = [50, 100, 200, 500, 1000].filter(a => a >= total)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!isComplete ? (
          <>
            <DialogHeader>
              <DialogTitle>Payment</DialogTitle>
              <DialogDescription>
                Total amount: {formatPeso(total)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Payment Method Selection */}
              <div>
                <p className="text-sm font-medium mb-2">Payment Method</p>
                {enabledPaymentMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No payment methods enabled. Please contact your administrator.
                  </p>
                ) : (
                  <div className={`grid gap-2 ${enabledPaymentMethods.length === 1 ? 'grid-cols-1' : enabledPaymentMethods.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {enabledPaymentMethods.map(method => (
                      <Button
                        key={method.type}
                        variant={paymentType === method.type ? 'default' : 'outline'}
                        className="h-auto py-4 flex-col gap-2"
                        onClick={() => setPaymentType(method.type)}
                      >
                        <method.icon className="size-5" />
                        <span className="text-sm">{method.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cash Payment Details */}
              {paymentType === 'cash' && (
                <FieldGroup>
                  <Field>
                    <FieldLabel>Amount Received</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      value={amountReceived || ''}
                      onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                      className="text-lg tabular-nums"
                      placeholder="0.00"
                    />
                  </Field>

                  <div className="flex flex-wrap gap-2">
                    {quickAmounts.slice(0, 4).map(amount => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setAmountReceived(amount)}
                      >
                        {formatPeso(amount)}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAmountReceived(total)}
                    >
                      Exact
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg">
                    <span className="font-medium">Change</span>
                    <span className={`font-bold tabular-nums ${change > 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                      {formatPeso(change)}
                    </span>
                  </div>
                </FieldGroup>
              )}

              {/* E-wallet info */}
              {paymentType !== 'cash' && (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Scan QR code or enter reference number
                  </p>
                  <div className="flex size-32 items-center justify-center rounded-lg border mx-auto bg-background">
                    <span className="text-xs text-muted-foreground">QR Code</span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={!canProceed || isProcessing}
              >
                {isProcessing ? 'Processing...' : `Pay ${formatPeso(total)}`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10 mx-auto mb-4">
                <Check className="size-8 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle>Payment Complete!</DialogTitle>
              <DialogDescription>
                Transaction {receipt?.invoiceNo ?? invoiceNo} completed successfully
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Receipt Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span>{receipt?.itemsCount ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{formatPeso(receipt?.subtotal ?? 0)}</span>
                </div>
                {(receipt?.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span className="tabular-nums">-{formatPeso(receipt?.discount ?? 0)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total Due</span>
                  <span className="tabular-nums">{formatPeso(receipt?.total ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {receipt?.paymentType === 'cash' ? 'Cash Received' : 'Amount Paid'}
                  </span>
                  <span className="tabular-nums">{formatPeso(receipt?.amountPaid ?? 0)}</span>
                </div>
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Change Given</span>
                  <span className="tabular-nums">{formatPeso(receipt?.changeGiven ?? 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Payment</span>
                  <span className="capitalize">{receipt?.paymentType ?? paymentType}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handlePrintReceipt} className="flex-1">
                <Printer className="size-4 mr-2" />
                Print Receipt
              </Button>
              <Button onClick={handleClose} className="flex-1">
                New Sale
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
