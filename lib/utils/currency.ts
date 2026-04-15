// Philippine Peso currency formatting utilities

const PESO_SYMBOL = '\u20b1'

/**
 * Format a number as Philippine Peso currency
 * @param amount - The amount to format
 * @param showSymbol - Whether to include the peso sign (default: true)
 * @returns Formatted currency string
 */
export function formatPeso(amount: number, showSymbol: boolean = true): string {
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

  return showSymbol ? `${PESO_SYMBOL}${formatted}` : formatted
}

/**
 * Format a number as compact Philippine Peso (e.g., ?1.2K, ?5.5M)
 * @param amount - The amount to format
 * @returns Compact formatted currency string
 */
export function formatPesoCompact(amount: number): string {
  if (amount >= 1000000) {
    return `${PESO_SYMBOL}${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `${PESO_SYMBOL}${(amount / 1000).toFixed(1)}K`
  }
  return formatPeso(amount)
}

/**
 * Format a number as a short chart-friendly Philippine Peso label.
 * Examples: ?950, ?2k, ?1.5M
 */
export function formatPesoShort(amount: number): string {
  const absoluteAmount = Math.abs(amount)
  const prefix = amount < 0 ? '-' : ''

  if (absoluteAmount >= 1000000000) {
    return `${prefix}${PESO_SYMBOL}${(absoluteAmount / 1000000000).toFixed(1)}B`
  }

  if (absoluteAmount >= 1000000) {
    return `${prefix}${PESO_SYMBOL}${(absoluteAmount / 1000000).toFixed(1)}M`
  }

  if (absoluteAmount >= 1000) {
    const thousands = absoluteAmount / 1000
    const formattedThousands = thousands >= 10 ? thousands.toFixed(0) : thousands.toFixed(1)
    return `${prefix}${PESO_SYMBOL}${formattedThousands}k`
  }

  return `${prefix}${PESO_SYMBOL}${new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 0,
  }).format(absoluteAmount)}`
}

/**
 * Parse a peso string back to a number
 * @param value - The string to parse
 * @returns Parsed number or 0 if invalid
 */
export function parsePeso(value: string): number {
  const cleaned = value.replace(/[?,\s]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format number with thousand separators
 * @param num - The number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-PH').format(num)
}

/**
 * Calculate percentage change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change with sign
 */
export function calculatePercentageChange(current: number, previous: number): string {
  if (previous === 0) return '+0%'
  const change = ((current - previous) / previous) * 100
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

/**
 * Alias for formatPeso for compatibility
 */
export const formatCurrency = formatPeso
