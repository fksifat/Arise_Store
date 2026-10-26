'use client';

import { createContext, useContext } from 'react';

export const MerchantContext = createContext<{ shop: any; updateShop: (shop: any) => void } | null>(null);

export function useMerchant() {
  const merchant = useContext(MerchantContext);
  if (!merchant) throw new Error('Merchant pages must use the dashboard layout.');
  return merchant;
}
