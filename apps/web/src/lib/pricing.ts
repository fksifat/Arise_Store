export function percentageDiscount(subtotal: number, percent: number) {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) return 0;
  // Split before multiplying so large valid cart totals retain integer precision.
  return Math.floor(subtotal / 100) * percent + Math.floor(((subtotal % 100) * percent + 50) / 100);
}

export function parsePrice(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Enter a nonnegative price with at most two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount > 100000000000) throw new Error('Price is too large.');
  return amount;
}

export function defaultVariant(product: any) {
  const active = (product.variants || []).filter((variant: any) => variant.is_active);
  const available = active.filter((variant: any) => !product.track_inventory || variant.stock_quantity > 0);
  return (available.length ? available : active).reduce((best: any, variant: any) => !best || (variant.price_minor ?? product.price_minor) < (best.price_minor ?? product.price_minor) ? variant : best, undefined);
}

export const startingPrice = (product: any) => defaultVariant(product)?.price_minor ?? product.price_minor;
