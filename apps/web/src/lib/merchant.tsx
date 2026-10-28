'use client';

import { createContext, useContext } from 'react';

export type PortfolioStore = { id: string; owner_user_id: string; name: string; slug: string; status: string; website_type: string };
export const MerchantContext = createContext<{ shop: any; shops: PortfolioStore[]; selectShop: (id: string) => void; updateShop: (shop: any) => void } | null>(null);

export function useMerchant() {
  const merchant = useContext(MerchantContext);
  if (!merchant) throw new Error('Merchant pages must use the dashboard layout.');
  return merchant;
}
