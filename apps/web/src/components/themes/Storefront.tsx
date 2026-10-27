'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronRight, CreditCard, MapPin, Menu, Package, Search, ShoppingBag, Truck, X } from 'lucide-react';
import { getStorefrontTheme } from '@/lib/storefront-themes';
import { startingPrice } from '@/lib/pricing';
import { useCart } from '@/lib/cart';
import { ProductImage } from '@/components/ProductImage';
import { ProductPurchase } from '@/components/ProductPurchase';
import './storefront.css';
import './variants.css';

const money = (amount: number) => `৳${(amount / 100).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;

export function Storefront({ store, products, preview = false }: { store: any; products: any[]; preview?: boolean }) {
  const preset = getStorefrontTheme(store.theme?.theme_key);
  const settings = store.theme?.settings || {};
  const hero = settings.hero || {};
  const promotion = settings.promotion || {};
  const offerEnabled = promotion.enabled === true;
  const discountPercent = offerEnabled && Number.isInteger(promotion.discount_percent) && promotion.discount_percent >= 0 && promotion.discount_percent <= 100 ? promotion.discount_percent : 0;
  const legacyHero = settings.homepage_sections?.find((section: any) => section.type === 'hero' && section.enabled !== false);
  const { items, setIsCartOpen } = useCart();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const quickView = useRef<HTMLDialogElement>(null);
  const categories: any[] = store.categories || [];
  const term = search.trim().toLowerCase();
  const visibleProducts = products.filter(product => (!categoryId || product.category_ids.includes(categoryId)) && `${product.name} ${product.sku || ''}`.toLowerCase().includes(term));
  if (sortBy !== 'newest') visibleProducts.sort((a, b) => sortBy === 'price_asc' ? startingPrice(a) - startingPrice(b) : startingPrice(b) - startingPrice(a));
  const quantity = items.reduce((count, item) => count + item.quantity, 0);
  const heroImage = store.banner_url || hero.image_url || preset.image;
  const customColor = settings.brand?.primary_color;
  const accent = /^#[0-9a-f]{6}$/i.test(customColor || '') ? customColor : preset.accent;
  const colors = [1, 3, 5].map(offset => parseInt(accent.slice(offset, offset + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const luminance = colors[0] * .2126 + colors[1] * .7152 + colors[2] * .0722;
  const onAccent = (luminance + .05) / .05 > 1.05 / (luminance + .05) ? '#151515' : '#ffffff';
  const trackUrl = preview ? '#preview-tracking' : `/store/${store.slug}/track`;
  const clearFilters = () => { setSearch(''); setCategoryId(''); setSortBy('newest'); };
  const chooseCategory = (id: string) => {
    setCategoryId(id); setMenuOpen(false);
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const closeQuickView = () => { quickView.current?.close(); setSelectedProduct(null); };

  useEffect(() => {
    if (!selectedProduct || !quickView.current) return;
    if (!quickView.current.open) quickView.current.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [selectedProduct]);

  return <div className={`sf sf--${preset.family} sf--${preset.key}${preset.family !== preset.key ? ' sf-variant' : ''}`} style={{ '--sf-accent': accent, '--sf-on-accent': onAccent } as CSSProperties}>
    <a href="#catalog" className="sf-skip">Skip to products</a>
    <div className="sf-utility">
      <span><Truck size={13} aria-hidden="true" /> Cash on Delivery available</span>
      <span className="sf-utility-note">Delivery fees confirmed at checkout</span>
      <span>BDT · ৳</span>
    </div>
    <header className="sf-header">
      <div className="sf-header-inner">
        <a href="#" className="sf-brand" aria-label={`${store.name} home`}>
          {store.logo_url ? <img src={store.logo_url} alt="" className="sf-logo" /> : <span className="sf-monogram" aria-hidden="true">{store.name.charAt(0)}</span>}
          <span>{store.name}<small>{preset.category}</small></span>
        </a>
        <nav className="sf-nav" aria-label="Main navigation">
          <a href="#catalog">Shop all</a>
          {categories.length > 0 && <a href="#collections">Collections</a>}
          <a href="#store-info">Our store</a>
          {(store.site_pages||[]).slice(0,2).map(page=><Link key={page.slug} href={`/site/${store.slug}/${page.slug}`}>{page.title}</Link>)}
        </nav>
        <div className="sf-header-actions">
          <button type="button" className="sf-icon-button sf-search-button" aria-label="Search the store" onClick={() => document.getElementById('storefront-search')?.focus()}><Search size={21} /></button>
          {!preview && <Link href={trackUrl} className="sf-track-link"><Package size={18} /> Track order</Link>}
          <button type="button" onClick={() => setIsCartOpen(true)} className="sf-bag" aria-label="Open cart"><ShoppingBag size={20} /><span>Bag</span><b>{quantity}</b></button>
          <button type="button" className="sf-icon-button sf-menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="storefront-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {menuOpen && <nav id="storefront-mobile-menu" className="sf-mobile-nav" aria-label="Mobile navigation">
        {(store.site_pages||[]).map(page=><Link key={page.slug} href={`/site/${store.slug}/${page.slug}`}>{page.title}</Link>)}
        <a href="#catalog" onClick={() => setMenuOpen(false)}>Shop all <ArrowUpRight size={16} /></a>
        {categories.map(category => <button type="button" key={category.id} onClick={() => chooseCategory(category.id)}>{category.name}<ChevronRight size={16} /></button>)}
        {!preview && <Link href={trackUrl}>Track an order <Package size={16} /></Link>}
      </nav>}
    </header>

    {offerEnabled && (promotion.message || discountPercent > 0) && <aside className="sf-offer" aria-label="Store offer">
      {promotion.message && <span>{promotion.message}</span>}
      {discountPercent > 0 && <strong>{discountPercent}% off products at checkout</strong>}
      <a href="#catalog">Shop now <ArrowRight size={14} /></a>
    </aside>}

    <section className="sf-hero" aria-label="Featured collection">
      <div className="sf-hero-copy">
        <span className="sf-eyebrow"><span />{hero.eyebrow || preset.eyebrow}</span>
        <h1>{hero.title || legacyHero?.title || preset.title}</h1>
        <p>{hero.subtitle || legacyHero?.subtitle || preset.subtitle}</p>
        <div className="sf-hero-actions"><a href="#catalog" className="sf-primary-link">{hero.button_text || 'Shop the collection'} <ArrowRight size={18} /></a><a href={categories.length ? '#collections' : '#store-info'} className="sf-text-link">{categories.length ? 'Explore collections' : 'Meet the store'} <ArrowDown size={15} /></a></div>
        <div className="sf-hero-caption"><span className="sf-caption-line" /> A fresh perspective on everyday essentials.</div>
      </div>
      <div className="sf-hero-media">
        <img src={heroImage} alt={hero.image_alt || (store.banner_url ? `${store.name} featured collection` : preset.image_alt)} onError={event => { if (event.currentTarget.getAttribute('src') !== preset.image) event.currentTarget.src = preset.image; }} fetchPriority="high" className="sf-hero-image" />
        <div className="sf-image-caption"><span>THE {preset.category.toUpperCase()} EDIT</span><ArrowUpRight size={22} /></div>
        <div className="sf-hero-stamp"><span>SELECTED</span><strong>for your<br />everyday.</strong></div>
      </div>
    </section>

    <div className="sf-service-strip">
      <div><CreditCard size={21} /><span><strong>Pay when it arrives</strong><small>Cash on Delivery at checkout</small></span></div>
      <div><Truck size={21} /><span><strong>Delivery, clearly priced</strong><small>Dhaka {money(Number(store.inside_dhaka_delivery_fee_minor))} · Outside {money(Number(store.outside_dhaka_delivery_fee_minor))}</small></span></div>
      <div><Package size={21} /><span><strong>Stay in the know</strong><small>{preview ? 'Order tracking on your live store' : 'Track your order with your phone number'}</small></span></div>
    </div>

    {categories.length > 0 && <section id="collections" className="sf-collections sf-container" aria-labelledby="collections-heading">
      <div className="sf-section-heading"><div><span className="sf-kicker">FIND YOUR FAVORITES</span><h2 id="collections-heading">Shop by collection</h2></div><a href="#catalog" className="sf-text-link">View everything <ArrowRight size={16} /></a></div>
      <div className="sf-collection-grid">{categories.slice(0, 6).map((category, index) => {
        const representative = products.find(product => product.category_ids.includes(category.id));
        const image = category.image_url || representative?.images?.[0]?.image_url;
        return <button type="button" key={category.id} className="sf-collection-tile" onClick={() => chooseCategory(category.id)}>
          <div className="sf-collection-image">{image ? <ProductImage src={image} alt={category.name} className="sf-collection-photo" /> : <span className="sf-collection-initial" aria-hidden="true">{category.name.charAt(0)}</span>}<span className="sf-collection-number">0{index + 1}</span></div>
          <span className="sf-collection-name">{category.name}<ArrowUpRight size={18} /></span>
        </button>;
      })}</div>
    </section>}

    <main id="catalog" className="sf-catalog sf-container">
      <div className="sf-section-heading"><div><span className="sf-kicker">THOUGHTFULLY SELECTED</span><h2>{preset.collection_title}</h2></div><span className="sf-product-count">{products.length} pieces to explore</span></div>
      <section className="sf-catalog-tools" aria-label="Browse products">
        <label className="sf-search-field"><Search size={18} aria-hidden="true" /><span className="sr-only">Search products</span><input id="storefront-search" type="search" placeholder="Search by name or SKU" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label className="sf-sort-field">Sort by <select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="newest">Newest first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label>
        {!preview && <Link href={trackUrl} className="sf-catalog-track">Track an order <ArrowUpRight size={14} /></Link>}
        <div role="group" aria-label="Product categories" className="sf-filter-list">{[{ id: '', name: 'All products' }, ...categories].map(category => <button type="button" key={category.id} aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>{category.name}</button>)}</div>
        <p role="status" className="sf-results">{visibleProducts.length} of {products.length} products</p>
      </section>
      {visibleProducts.length === 0 ? <div className="sf-empty"><Search size={30} /><h3>{products.length ? 'No products match your filters.' : 'Good things are on their way.'}</h3><p>{products.length ? 'Try another search or explore the full collection.' : 'Check back soon for the first collection.'}</p>{products.length > 0 && <button type="button" onClick={clearFilters} className="sf-primary-link">Clear filters <ArrowRight size={16} /></button>}</div> : <div className="sf-product-grid">{visibleProducts.map(product => {
        const image = product.images?.find((item: any) => item.is_primary)?.image_url || product.images?.[0]?.image_url;
        const sale = product.compare_at_price_minor > startingPrice(product);
        return <article key={product.id} className="sf-product-card">
          <button type="button" className="sf-product-photo-button" aria-label={`View ${product.name}`} onClick={() => setSelectedProduct(product)}><ProductImage src={image} alt={product.name} className="sf-product-photo" />{sale && <span className="sf-sale-badge">{product.variants?.some((variant: any) => variant.is_active) ? 'Sale options' : 'Special price'}</span>}<span className="sf-quick-view">View details <ArrowUpRight size={16} /></span></button>
          <div className="sf-product-copy"><span className="sf-product-category">{categories.find(category => product.category_ids.includes(category.id))?.name || preset.category}</span><h4><button type="button" onClick={() => setSelectedProduct(product)}>{product.name}</button></h4><p>{product.description || 'Discover the details. Find your everyday favorite.'}</p><ProductPurchase product={product} imageUrl={image} className="sf-add-button" label="Add to Bag" /></div>
        </article>;
      })}</div>}
    </main>

    <section className="sf-story sf-container" id="store-info">
      <div><span className="sf-kicker">A STORE WITH A POINT OF VIEW</span><h2>Good finds.<br />A personal touch.</h2></div>
      <div><p>{store.description || `Welcome to ${store.name}. Explore a collection brought together with care, and find the pieces that fit your everyday.`}</p><a href="#catalog" className="sf-text-link">Discover the collection <ArrowRight size={17} /></a></div>
      <span className="sf-story-monogram" aria-hidden="true">{store.name.charAt(0)}</span>
    </section>
    <footer className="sf-footer"><div className="sf-footer-main sf-container"><div className="sf-footer-brand"><strong>{store.name}</strong><p>Your everyday, thoughtfully selected.</p></div><div><h3>Explore</h3><a href="#catalog">Shop all products</a>{(store.site_pages||[]).map(page=><Link key={page.slug} href={`/site/${store.slug}/${page.slug}`}>{page.title}</Link>)}{categories.length > 0 && <a href="#collections">Our collections</a>}{!preview && <Link href={trackUrl}>Track your order</Link>}</div><div><h3>Here to help</h3>{store.contact_email && <a href={`mailto:${store.contact_email}`}>{store.contact_email}</a>}{store.contact_phone && <a href={`tel:${store.contact_phone}`}>{store.contact_phone}</a>}{store.address && <p><MapPin size={14} />{store.address}</p>}{!store.contact_email && !store.contact_phone && <p>Contact details will be shared by the store.</p>}</div><div><h3>Made for your everyday</h3><p>Shop in Bangladeshi Taka.<br />Pay on delivery.<br />Track your order online.</p><span className="sf-footer-payment"><CreditCard size={16} /> CASH ON DELIVERY</span></div></div><div className="sf-footer-bottom sf-container"><span>© {new Date().getFullYear()} {store.name}</span><span>Thoughtfully powered by Arise Store <ArrowUpRight size={12} /></span></div></footer>

    {selectedProduct && <dialog ref={quickView} className="sf-quick-dialog" aria-labelledby="quick-view-title" onClose={() => setSelectedProduct(null)} onClick={event => { if (event.target === event.currentTarget) closeQuickView(); }}>
      <button type="button" className="sf-dialog-close" aria-label="Close product details" onClick={closeQuickView}><X size={22} /></button><div className="sf-quick-grid"><ProductImage src={selectedProduct.images?.find((image: any) => image.is_primary)?.image_url || selectedProduct.images?.[0]?.image_url} alt={selectedProduct.name} className="sf-quick-image" /><div className="sf-quick-copy"><span className="sf-kicker">THE DETAILS</span><h2 id="quick-view-title">{selectedProduct.name}</h2><p>{selectedProduct.description || 'A thoughtfully selected addition to your everyday.'}</p>{selectedProduct.sku && <small>SKU: {selectedProduct.sku}</small>}<ProductPurchase product={selectedProduct} imageUrl={selectedProduct.images?.[0]?.image_url} className="sf-add-button" label="Add to Bag" onAdded={closeQuickView} /><p className="sf-quick-note"><Check size={15} />Cash on Delivery · Delivery calculated at checkout</p></div></div>
    </dialog>}
  </div>;
}
