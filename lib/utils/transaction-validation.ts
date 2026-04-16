import type { Transaction, TransactionItem } from '@/lib/types'

export interface ValidationError {
  field: string
  message: string
}

/**
 * Validate a single transaction item
 */
export function validateTransactionItem(item: Partial<TransactionItem>, index: number): ValidationError[] {
  const errors: ValidationError[] = []

  if (!item.productId) {
    errors.push({ field: `items.${index}.productId`, message: 'Product ID is required' })
  }

  if (!item.productName) {
    errors.push({ field: `items.${index}.productName`, message: 'Product name is required' })
  }

  if (!item.quantity || item.quantity <= 0) {
    errors.push({ field: `items.${index}.quantity`, message: 'Quantity must be greater than 0' })
  } else if (!Number.isInteger(item.quantity)) {
    errors.push({ field: `items.${index}.quantity`, message: 'Quantity must be a whole number' })
  }

  if (item.unitPrice === undefined || item.unitPrice === null) {
    errors.push({ field: `items.${index}.unitPrice`, message: 'Unit price is required' })
  } else if (item.unitPrice < 0) {
    errors.push({ field: `items.${index}.unitPrice`, message: 'Unit price cannot be negative' })
  }

  // Validate subtotal calculation if both quantity and unitPrice exist
  if (item.quantity && item.unitPrice !== undefined) {
    const expectedSubtotal = item.quantity * item.unitPrice
    const tolerance = 0.01
    if (item.subtotal && Math.abs(expectedSubtotal - item.subtotal) > tolerance) {
      errors.push({
        field: `items.${index}.subtotal`,
        message: `Subtotal mismatch: expected ${expectedSubtotal.toFixed(2)}, got ${item.subtotal.toFixed(2)}`,
      })
    }
  }

  return errors
}

/**
 * Validate transaction data with full business logic
 */
export function validateTransaction(transaction: Partial<Transaction>): ValidationError[] {
  const errors: ValidationError[] = []

  // Validate items
  if (!transaction.items || transaction.items.length === 0) {
    errors.push({ field: 'items', message: 'Transaction must contain at least one item' })
  } else {
    transaction.items.forEach((item, index) => {
      const itemErrors = validateTransactionItem(item, index)
      errors.push(...itemErrors)
    })
  }

  // Validate subtotal
  if (transaction.subtotal === undefined || transaction.subtotal === null) {
    errors.push({ field: 'subtotal', message: 'Subtotal is required' })
  } else if (transaction.subtotal < 0) {
    errors.push({ field: 'subtotal', message: 'Subtotal cannot be negative' })
  }

  // Validate total
  if (transaction.total === undefined || transaction.total === null) {
    errors.push({ field: 'total', message: 'Total is required' })
  } else if (transaction.total < 0) {
    errors.push({ field: 'total', message: 'Total cannot be negative' })
  }

  // Validate discount
  if (transaction.discount !== undefined && transaction.discount !== null) {
    if (transaction.discount < 0) {
      errors.push({ field: 'discount', message: 'Discount cannot be negative' })
    } else if (transaction.discount > (transaction.subtotal || 0)) {
      errors.push({ field: 'discount', message: 'Discount cannot exceed subtotal' })
    }
  }

  // Validate payment type
  if (!transaction.paymentType) {
    errors.push({ field: 'paymentType', message: 'Payment type is required' })
  } else if (!['cash', 'gcash', 'maya'].includes(transaction.paymentType)) {
    errors.push({ field: 'paymentType', message: 'Invalid payment type' })
  }

  // Validate calculation consistency
  if (transaction.items && transaction.subtotal !== null && transaction.subtotal !== undefined) {
    const calculatedSubtotal = transaction.items.reduce((sum, item) => sum + item.subtotal, 0)
    const tolerance = 0.01
    if (Math.abs(calculatedSubtotal - transaction.subtotal) > tolerance) {
      errors.push({
        field: 'subtotal',
        message: `Subtotal mismatch: expected ${calculatedSubtotal.toFixed(2)}, got ${transaction.subtotal.toFixed(2)}`,
      })
    }
  }

  // Validate total = subtotal - discount
  if (transaction.subtotal !== null && transaction.subtotal !== undefined && transaction.total !== null && transaction.total !== undefined) {
    const discount = transaction.discount || 0
    const expectedTotal = transaction.subtotal - discount
    const tolerance = 0.01
    if (Math.abs(expectedTotal - transaction.total) > tolerance) {
      errors.push({
        field: 'total',
        message: `Total mismatch: expected ${expectedTotal.toFixed(2)}, got ${transaction.total.toFixed(2)}`,
      })
    }
  }

  return errors
}

/**
 * Validate refund request
 */
export function validateRefundRequest(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!data.transactionId) {
    errors.push({ field: 'transactionId', message: 'Transaction ID is required' })
  } else if (typeof data.transactionId !== 'string') {
    errors.push({ field: 'transactionId', message: 'Transaction ID must be a string' })
  }

  if (data.reason !== undefined && typeof data.reason !== 'string') {
    errors.push({ field: 'reason', message: 'Reason must be a string' })
  }

  return errors
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  const formatted: Record<string, string> = {}
  errors.forEach((error) => {
    formatted[error.field] = error.message
  })
  return formatted
}
