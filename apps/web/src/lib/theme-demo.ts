import { getStorefrontTheme } from './storefront-themes';

const sampleCatalog: Record<string, { name: string; categories: string[]; products: [string, string, number][] }> = {
  'fashion-modern': { name: 'ATELIER / everyday', categories: ['The essentials', 'Quiet statements', 'Everyday carry'], products: [['The Everyday Shirt', 'shirt', 245000], ['A Little Weekend Dress', 'dress', 380000], ['The Go-Anywhere Bag', 'bag', 195000], ['The Relaxed Shirt', 'shirt', 220000]] },
  'general-store': { name: 'goodday market', categories: ['Fresh picks', 'Daily staples', 'The pantry'], products: [['Seasonal Fruit Selection', 'fruit', 65000], ['The Vegetable Basket', 'vegetables', 42000], ['Market Essentials Box', 'market', 125000], ['Fresh Fruit for the Week', 'fruit', 89000]] },
  'tech-cosmetics': { name: 'form / technology', categories: ['Audio', 'Everyday tech', 'Accessories'], products: [['Studio Over-Ear Headphones', 'tech', 650000], ['The Everyday Watch', 'watch', 390000], ['Your Everyday Smartphone', 'phone', 2850000], ['Studio Listening Set', 'tech', 820000]] },
  'home-living': { name: 'haven & form', categories: ['Living', 'Lighting', 'The finishing touches'], products: [['The Reading Chair', 'chair', 1850000], ['A Warm Light', 'lamp', 450000], ['A Considered Living Space', 'home', 4200000], ['The Accent Chair', 'chair', 1650000]] },
  'beauty-studio': { name: 'muse. beauty studio', categories: ['Daily rituals', 'Makeup', 'The beauty shelf'], products: [['The Daily Ritual', 'beauty', 185000], ['The Color Collection', 'makeup', 245000], ['The Evening Edit', 'beauty', 225000], ['Everyday Color Essentials', 'makeup', 165000]] },
  'sport-performance': { name: 'PACE / movement', categories: ['Training', 'Hydration', 'Everyday carry'], products: [['The Everyday Training Set', 'training', 350000], ['The Refill Bottle', 'bottle', 125000], ['The Training Backpack', 'bag', 285000], ['Studio Session Essentials', 'training', 420000]] },
};

export function makeThemeDemo(key: string) {
  const preset = getStorefrontTheme(key);
  const sample = sampleCatalog[preset.family];
  const categories = sample.categories.map((name, index) => ({ id: `category-${index}`, name }));
  const products = [...sample.products, ...sample.products.map(([name, image, price], index) => [`${name} — ${index % 2 ? 'Signature' : 'Classic'}`, image, price + 15000] as [string, string, number])].map(([name, image, price], index) => ({
    id: `preview-${preset.key}-${index}`, name, description: 'An everyday favorite, selected with a thoughtful eye for the details.',
    sku: `DEMO-${index + 1}`, price_minor: price, compare_at_price_minor: index === 1 ? price + 50000 : null,
    stock_quantity: 12, track_inventory: true, category_ids: [categories[index % categories.length].id],
    images: [{ image_url: `/themes/assets/${image}.jpg`, is_primary: true }],
    variants: index === 0 ? [{ id: `${preset.key}-option-1`, title: 'Classic', stock_quantity: 10, price_minor: price, is_active: true }, { id: `${preset.key}-option-2`, title: 'Signature', stock_quantity: 8, price_minor: price + 25000, is_active: true }] : [],
  }));
  return { products, store: { name: sample.name, slug: `preview-${preset.key}`, description: preset.subtitle, contact_email: null, contact_phone: null, address: 'Bangladesh', logo_url: null, banner_url: null, inside_dhaka_delivery_fee_minor: '6000', outside_dhaka_delivery_fee_minor: '12000', categories, theme: { theme_key: preset.key, settings: {} } } };
}
