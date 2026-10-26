export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  imageUrl?: string;
  priceMinor: number;
  quantity: number;
  stockAvailable: number;
}

export const cartLimit = (item: CartItem) => Math.min(100, Math.max(0, item.stockAvailable));

export function restoreCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const items: CartItem[] = [];
  for (const item of value.slice(0, 100)) {
    if (!item || typeof item.productId !== 'string' || !item.productId || typeof item.name !== 'string' ||
        (item.variantId !== undefined && typeof item.variantId !== 'string') ||
        !Number.isSafeInteger(item.priceMinor) || item.priceMinor < 0 || item.priceMinor > 100000000000 ||
        !Number.isInteger(item.quantity) || item.quantity < 1 ||
        !Number.isInteger(item.stockAvailable) || item.stockAvailable < 0 || item.stockAvailable > 1000000000) continue;
    const existing = items.find(saved => saved.productId === item.productId && saved.variantId === item.variantId);
    if (existing) existing.quantity = Math.min(Math.max(1, cartLimit(existing)), existing.quantity + item.quantity);
    else items.push({ ...item, imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined, quantity: Math.min(item.quantity, Math.max(1, cartLimit(item))) });
  }
  return items;
}
