// Currency conversion utility
// USD to JPY exchange rate (approximate)
const USD_TO_JPY = 150

export function formatCurrency(amount, currency = 'USD') {
  if (currency === 'JPY') {
    const yenAmount = Math.round(amount * USD_TO_JPY)
    return `¥${yenAmount.toLocaleString('ja-JP')}`
  }
  // Default USD
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function formatCurrencyWithDecimals(amount, currency = 'USD', decimals = 0) {
  if (currency === 'JPY') {
    const yenAmount = Math.round(amount * USD_TO_JPY)
    return `¥${yenAmount.toLocaleString('ja-JP')}`
  }
  // Default USD
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export function convertAmount(amount, currency = 'USD') {
  if (currency === 'JPY') {
    return Math.round(amount * USD_TO_JPY)
  }
  return amount
}

// Short form for headline figures: $31.2M / ¥47億
export function formatCurrencyCompact(amount, currency = 'USD') {
  const isJPY = currency === 'JPY'
  const text = new Intl.NumberFormat(isJPY ? 'ja-JP' : 'en-US', {
    style: 'currency',
    currency: isJPY ? 'JPY' : 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(convertAmount(amount, currency))
  return text.replace('￥', '¥') // match the half-width yen used elsewhere in the app
}
