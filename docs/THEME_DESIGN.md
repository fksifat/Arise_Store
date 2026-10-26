# Storefront theme library

The library contains 18 designs across six store categories, with three designs in every category. They share commerce behavior while changing typography, imagery, colors, hero composition and product-grid density. The original six theme keys remain compatible with existing stores. Retailer references informed general shopping patterns; no retailer page code is included.

## Browse within a category

| Category | Available designs |
|---|---|
| Fashion | Fashion Editorial, Fashion Noir, Fashion Runway |
| Electronics | Tech Minimal, Tech Circuit, Tech Studio |
| Grocery & essentials | Daily Market, Fresh Pantry, Market Express |
| Home & furniture | Home & Living, Home Gallery, Scandi Living |
| Beauty & skincare | Beauty Studio, Botanical Ritual, Beauty Atelier |
| Sport & outdoor | Sport Performance, Trail Supply, Active Club |

The merchant gallery groups all designs into category sections. Category buttons show counts, and **Explore category** narrows the gallery to its three designs. The public homepage also lets visitors choose a category before comparing designs. Preview pages link to the other designs in the same category, with the current design marked. Each gallery thumbnail is a browser capture of its actual storefront.

The additional designs include full-width fashion/interiors/outdoor campaigns, centered runway/beauty campaigns, an image-first technology showroom, compact electronics and grocery catalogs, rounded pantry imagery, architectural home framing, sage beauty styling and a blue sports layout. They use the existing local photo collection and appropriate category-specific sample products. Preview bags remain isolated by theme; switching previews clears open dialogs/notices while retaining each preview's saved bag.

## Original design directions

| Theme key | Name | Direction and research references |
|---|---|---|
| `fashion-modern` | Fashion Editorial | Cream, editorial serif type, split photography and generous spacing. Category browsing references: [UNIQLO](https://www.uniqlo.com/us/en/), [Zara](https://www.zara.com/us/). |
| `general-store` | Daily Market | Forest green, rounded collection tiles, compact catalog and prominent search. Clear everyday category navigation. |
| `tech-cosmetics` | Tech Minimal | Blue accents, spacious product showcase and clean device presentation. Reference: [Apple Store](https://www.apple.com/store). The existing key is retained for compatibility. |
| `home-living` | Home & Living | Warm neutrals, lifestyle photography, arch composition and room-led collections. Reference: [IKEA](https://www.ikea.com/us/en/). |
| `beauty-studio` | Beauty Studio | Blush tones, restrained serif type, curved imagery and routine-led browsing. Reference: [Sephora](https://www.sephora.com/). |
| `sport-performance` | Sport Performance | Dark campaign photography, bold italic display type and lime accents. Reference: [Nike](https://www.nike.com/). |

## Behavior

- The marketing page and merchant gallery show screenshots of the actual layouts. Each links to `/themes/<theme-key>`, an interactive preview with sample products. Preview carts are isolated from real stores; checkout explains that a merchant must apply the theme to receive orders.
- Real stores use merchant products, categories, images, branding, descriptions, contact details and delivery fees. Product quick views support descriptions, SKU, variants and current variant pricing. Search, sorting, collection filters, cart and COD checkout work in every design.
- Only real price reductions show a sale badge. Delivery and payment information reflects implemented COD checkout; the themes do not invent reviews, warranties, free delivery or promotional deadlines.
- Theme changes preserve custom brand fields and individual hero overrides. Fields matching the previous theme's defaults refresh to the new design. Products, stock, orders and publication state are independent of theme changes.
- Layouts adapt to desktop and mobile. Menus have accessible labels; native product dialogs support keyboard dismissal and focus handling. Accent buttons select dark or light text based on the merchant's chosen color. Reduced-motion preferences are respected.

Merchant Settings also includes a banner/offer editor. Its image, headline, description, button label and enabled announcement render in every theme. An optional percentage discount applies to current product/variant subtotals at checkout, with delivery excluded. Theme changes preserve the offer; changing an offer leaves saved order totals unchanged. See [offer instructions](OFFERS.md).

## Implementation

`services/api/app/theme_catalog.json` is the shared manifest for API seeding and frontend theme metadata. Seeding updates reference metadata without rewriting merchant settings. Existing theme keys remain compatible.

`apps/web/src/components/themes/Storefront.tsx` and `storefront.css` contain the shared storefront and original visual treatments. Each manifest entry's `family` connects related demo products and base styles; `variants.css` scopes the additional compositions to their new theme keys. Commerce uses the existing cart, purchase and checkout components. Assets are served locally from `apps/web/public/themes/`, including gallery screenshots in `previews/`; customer browsers do not depend on a remote image host for these defaults.

## Photography credits

Photos were retrieved from Unsplash image URLs. The IDs below identify the exact source; each local filename is under `apps/web/public/themes/assets/`. Images were resized and compressed when downloaded.

| Local file | Source |
|---|---|
| `fashion.jpg` | [Unsplash photo-1445205170230-053b83016050](https://images.unsplash.com/photo-1445205170230-053b83016050) |
| `market.jpg` | [Unsplash photo-1542838132-92c53300491e](https://images.unsplash.com/photo-1542838132-92c53300491e) |
| `tech.jpg` | [Unsplash photo-1505740420928-5e560c06d30e](https://images.unsplash.com/photo-1505740420928-5e560c06d30e) |
| `home.jpg` | [Unsplash photo-1600210492486-724fe5c67fb0](https://images.unsplash.com/photo-1600210492486-724fe5c67fb0) |
| `beauty.jpg` | [Unsplash photo-1608571423902-eed4a5ad8108](https://images.unsplash.com/photo-1608571423902-eed4a5ad8108) |
| `sport.jpg` | [Unsplash photo-1534438327276-14e5300c3a48](https://images.unsplash.com/photo-1534438327276-14e5300c3a48) |
| `shirt.jpg` | [Unsplash photo-1596755094514-f87e34085b2c](https://images.unsplash.com/photo-1596755094514-f87e34085b2c) |
| `dress.jpg` | [Unsplash photo-1496747611176-843222e1e57c](https://images.unsplash.com/photo-1496747611176-843222e1e57c) |
| `bag.jpg` | [Unsplash photo-1553062407-98eeb64c6a62](https://images.unsplash.com/photo-1553062407-98eeb64c6a62) |
| `fruit.jpg` | [Unsplash photo-1619566636858-adf3ef46400b](https://images.unsplash.com/photo-1619566636858-adf3ef46400b) |
| `vegetables.jpg` | [Unsplash photo-1518843875459-f738682238a6](https://images.unsplash.com/photo-1518843875459-f738682238a6) |
| `watch.jpg` | [Unsplash photo-1523275335684-37898b6baf30](https://images.unsplash.com/photo-1523275335684-37898b6baf30) |
| `phone.jpg` | [Unsplash photo-1511707171634-5f897ff02aa9](https://images.unsplash.com/photo-1511707171634-5f897ff02aa9) |
| `chair.jpg` | [Unsplash photo-1567538096630-e0c55bd6374c](https://images.unsplash.com/photo-1567538096630-e0c55bd6374c) |
| `lamp.jpg` | [Unsplash photo-1507473885765-e6ed057f782c](https://images.unsplash.com/photo-1507473885765-e6ed057f782c) |
| `makeup.jpg` | [Unsplash photo-1596462502278-27bfdc403348](https://images.unsplash.com/photo-1596462502278-27bfdc403348) |
| `bottle.jpg` | [Unsplash photo-1602143407151-7111542de6e8](https://images.unsplash.com/photo-1602143407151-7111542de6e8) |
| `training.jpg` | [Unsplash photo-1517836357463-d25dfeac3438](https://images.unsplash.com/photo-1517836357463-d25dfeac3438) |

See [verification results](VERIFICATION.md) for executed checks and remaining limits.
