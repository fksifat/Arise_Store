import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User
from app.models.shop import Shop, ShopMembership, ShopDomain
from app.models.theme import Theme, ShopThemeSetting
from app.models.subscription import Plan, Subscription
from app.models.catalog import Category, Product, ProductCategory, ProductImage, ProductVariant
from app.models.order import Order, OrderItem
from app.models.customer import Customer
from app.config import settings

def seed_all(demo=False):
    if demo and settings.APP_ENV == "production":
        raise ValueError("Demo accounts are forbidden in production")
    db = SessionLocal()

    try:
        # 1. Seed Themes
        catalog = json.loads((Path(__file__).resolve().parents[1] / "theme_catalog.json").read_text())
        for preset in catalog:
            values = {
                "name": preset["name"], "version": preset["version"],
                "description": preset["description"], "preview_image_url": preset["preview_image_url"],
                "configuration_schema": json.dumps({
                    "theme_key": preset["key"],
                    "brand": {"primary_color": preset["accent"]},
                    "hero": {"eyebrow": preset["eyebrow"], "title": preset["title"], "subtitle": preset["subtitle"], "image_url": preset["image"]},
                }),
            }
            theme = db.query(Theme).filter(Theme.theme_key == preset["key"]).first()
            if not theme:
                db.add(Theme(theme_key=preset["key"], **values))
            else:
                for field, value in values.items():
                    setattr(theme, field, value)
        db.commit()

        # 2. Seed Subscription Plans
        plans_data = [
            {
                "slug": "starter",
                "name": "Starter",
                "price_monthly_minor": 49900,  # ৳499
                "price_annual_minor": 499000,  # ৳4,990 (2 months free)
                "currency": "BDT",
                "product_limit": 100,
                "custom_domain_allowed": False,
                "features_json": json.dumps([
                    "Up to 100 products",
                    "Platform subdomain (shop.arisestore.com)",
                    f"All {len(catalog)} storefront themes",
                    "Cash on Delivery checkout",
                    "Order management & tracking",
                    "Mobile-responsive storefront"
                ])
            },
            {
                "slug": "growth",
                "name": "Growth",
                "price_monthly_minor": 99900,  # ৳999
                "price_annual_minor": 999000,  # ৳9,990
                "currency": "BDT",
                "product_limit": 1000,
                "custom_domain_allowed": True,
                "features_json": json.dumps([
                    "Up to 1,000 products",
                    "DNS ownership verification; hosting configured separately",
                    "Product variants (Size, Color, etc.)",
                    "Guest customer records linked to orders",
                    "Custom delivery fee rates",
                    "Order snapshots and inventory tracking"
                ])
            },
            {
                "slug": "premium",
                "name": "Premium",
                "price_monthly_minor": 199900,  # ৳1,999
                "price_annual_minor": 1999000,  # ৳19,990
                "currency": "BDT",
                "product_limit": 10000,
                "custom_domain_allowed": True,
                "features_json": json.dumps([
                    "Up to 10,000 products",
                    "Owner and staff authorization boundaries",
                    "Zero transaction commissions",
                    f"All {len(catalog)} configurable storefront themes",
                    "Order fulfillment status management",
                    "Manual subscription payment confirmation"
                ])
            }
        ]

        for pd in plans_data:
            existing = db.query(Plan).filter(Plan.slug == pd["slug"]).first()
            if not existing:
                db.add(Plan(**pd))
            else:
                existing.features_json = pd["features_json"]
        db.commit()

        if not demo:
            return

        # 3. Seed Platform Administrator
        admin_email = "admin@arisestore.com"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                name="Arise Platform Admin",
                email=admin_email,
                phone="01700000001",
                password_hash=hash_password("adminpassword123"),
                role="platform_admin",
                is_active=True,
                email_verified_at=datetime.now(timezone.utc)
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # 4. Seed Demo Merchant
        merchant_email = "merchant@arisestore.com"
        merchant = db.query(User).filter(User.email == merchant_email).first()
        if not merchant:
            merchant = User(
                name="Rahim Chowdhury",
                email=merchant_email,
                phone="01712345678",
                password_hash=hash_password("merchantpassword123"),
                role="merchant",
                is_active=True,
                email_verified_at=datetime.now(timezone.utc)
            )
            db.add(merchant)
            db.commit()
            db.refresh(merchant)

        # 5. Seed Flagship Shop: "Fashion House"
        fashion_slug = "fashion-house"
        shop1 = db.query(Shop).filter(Shop.slug == fashion_slug).first()
        growth_plan = db.query(Plan).filter(Plan.slug == "growth").first()
        fashion_theme = db.query(Theme).filter(Theme.theme_key == "fashion-modern").first()

        if not shop1:
            shop1 = Shop(
                owner_user_id=merchant.id,
                name="Aura Fashion House",
                slug=fashion_slug,
                description="Premium handcrafted ethnic and western wear in Dhaka. Elegant fabrics made for lasting moments.",
                status="published",
                default_currency="BDT",
                default_locale="bn_BD",
                contact_email="sales@aurafashion.com",
                contact_phone="01712345678",
                address="House 42, Road 11, Banani, Dhaka-1213",
                inside_dhaka_delivery_fee_minor="6000",   # ৳60
                outside_dhaka_delivery_fee_minor="12000", # ৳120
                published_at=datetime.now(timezone.utc),
                logo_url="https://images.unsplash.com/photo-1544441893-675973e31985?w=300&q=80",
                banner_url="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80"
            )
            db.add(shop1)
            db.flush()

            # Membership
            db.add(ShopMembership(shop_id=shop1.id, user_id=merchant.id, role="owner", status="active"))

            # Subdomain
            db.add(ShopDomain(
                shop_id=shop1.id,
                hostname="fashion-house.arisestore.com",
                domain_type="platform_subdomain",
                verification_status="verified",
                routing_status="active",
                verified_at=datetime.now(timezone.utc)
            ))

            # Theme Settings
            if fashion_theme:
                db.add(ShopThemeSetting(
                    shop_id=shop1.id,
                    theme_id=fashion_theme.id,
                    theme_version=fashion_theme.version,
                    settings_json=fashion_theme.configuration_schema
                ))

            # Subscription
            if growth_plan:
                db.add(Subscription(
                    shop_id=shop1.id,
                    plan_id=growth_plan.id,
                    status="active",
                    billing_interval="monthly",
                    starts_at=datetime.now(timezone.utc),
                    current_period_start=datetime.now(timezone.utc),
                    current_period_end=datetime.now(timezone.utc) + timedelta(days=30)
                ))

            # Categories
            cat_panjabi = Category(shop_id=shop1.id, name="Mens Panjabi", slug="mens-panjabi", sort_order=1)
            cat_saree = Category(shop_id=shop1.id, name="Jamdani & Silk Sarees", slug="sarees", sort_order=2)
            cat_kurtis = Category(shop_id=shop1.id, name="Kurtis & Tunics", slug="kurtis", sort_order=3)
            db.add_all([cat_panjabi, cat_saree, cat_kurtis])
            db.flush()

            # Products
            p1 = Product(
                shop_id=shop1.id,
                name="Royal Royal Navy Semi-Silk Embroidered Panjabi",
                slug="royal-navy-semi-silk-panjabi",
                description="Crafted with pure blended semi-silk and intricate neck thread embroidery. Perfect for festive celebrations and weddings.",
                price_minor=285000, # ৳2,850
                compare_at_price_minor=350000, # ৳3,500
                currency="BDT",
                sku="PAN-NVY-01",
                stock_quantity=45,
                track_inventory=True,
                is_featured=True,
                status="active",
                published_at=datetime.now(timezone.utc)
            )
            db.add(p1)
            db.flush()
            db.add(ProductCategory(product_id=p1.id, category_id=cat_panjabi.id))
            db.add(ProductImage(product_id=p1.id, image_url="https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=600&q=80", is_primary=True, sort_order=0))
            db.add(ProductVariant(product_id=p1.id, title="Size: 40 (M)", sku="PAN-NVY-M", stock_quantity=15))
            db.add(ProductVariant(product_id=p1.id, title="Size: 42 (L)", sku="PAN-NVY-L", stock_quantity=20))
            db.add(ProductVariant(product_id=p1.id, title="Size: 44 (XL)", sku="PAN-NVY-XL", stock_quantity=10))

            p2 = Product(
                shop_id=shop1.id,
                name="Traditional Handloom Dhakai Jamdani Saree (Crimson Red)",
                slug="dhakai-jamdani-saree-crimson",
                description="Authentic hand-woven Dhakai Jamdani saree featuring delicate floral motifs across body and pallu.",
                price_minor=850000, # ৳8,500
                compare_at_price_minor=980000,
                currency="BDT",
                sku="SAR-JAM-01",
                stock_quantity=12,
                track_inventory=True,
                is_featured=True,
                status="active",
                published_at=datetime.now(timezone.utc)
            )
            db.add(p2)
            db.flush()
            db.add(ProductCategory(product_id=p2.id, category_id=cat_saree.id))
            db.add(ProductImage(product_id=p2.id, image_url="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80", is_primary=True, sort_order=0))

            p3 = Product(
                shop_id=shop1.id,
                name="Minimalist Pastel Floral Printed Linen Kurti",
                slug="pastel-floral-linen-kurti",
                description="Breathable organic linen kurti with gentle pastel print, side slits, and wooden button accent.",
                price_minor=165000, # ৳1,650
                currency="BDT",
                sku="KUR-LIN-03",
                stock_quantity=30,
                track_inventory=True,
                is_featured=True,
                status="active",
                published_at=datetime.now(timezone.utc)
            )
            db.add(p3)
            db.flush()
            db.add(ProductCategory(product_id=p3.id, category_id=cat_kurtis.id))
            db.add(ProductImage(product_id=p3.id, image_url="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80", is_primary=True, sort_order=0))

            # Initial Demo Order
            cust = Customer(shop_id=shop1.id, name="Tanvir Ahmed", phone="01799887766", email="tanvir@example.com", default_address="Flat 4B, Dhanmondi 27, Dhaka")
            db.add(cust)
            db.flush()

            demo_order = Order(
                shop_id=shop1.id,
                customer_id=cust.id,
                order_number="ORD-261024-10042",
                status="confirmed",
                payment_method="cod",
                payment_status="unpaid",
                subtotal_minor=285000,
                delivery_fee_minor=6000,
                discount_minor=0,
                total_minor=291000,
                currency="BDT",
                customer_name=cust.name,
                customer_phone=cust.phone,
                customer_email=cust.email,
                shipping_city="Dhaka",
                shipping_address=cust.default_address,
                customer_note="Please call before delivery"
            )
            db.add(demo_order)
            db.flush()

            db.add(OrderItem(
                order_id=demo_order.id,
                product_id=p1.id,
                product_name_snapshot=p1.name,
                sku_snapshot="PAN-NVY-L",
                variant_snapshot_json='{"size": "42 (L)"}',
                product_image_url_snapshot="https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=600&q=80",
                unit_price_minor=285000,
                quantity=1,
                line_total_minor=285000
            ))

        # 6. Seed Second Shop: "Gadget Zone"
        gadget_slug = "gadget-zone"
        shop2 = db.query(Shop).filter(Shop.slug == gadget_slug).first()
        tech_theme = db.query(Theme).filter(Theme.theme_key == "tech-cosmetics").first()

        if not shop2:
            shop2 = Shop(
                owner_user_id=merchant.id,
                name="Gadget Zone BD",
                slug=gadget_slug,
                description="Authentic smart gadgets, ANC wireless earbuds, smartwatches, and fast chargers with replacement warranty.",
                status="published",
                default_currency="BDT",
                default_locale="bn_BD",
                contact_email="support@gadgetzone.com",
                contact_phone="01811223344",
                address="Level 4, Multiplan Centre, Elephant Road, Dhaka",
                inside_dhaka_delivery_fee_minor="6000",
                outside_dhaka_delivery_fee_minor="12000",
                published_at=datetime.now(timezone.utc),
                logo_url="https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&q=80",
                banner_url="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80"
            )
            db.add(shop2)
            db.flush()
            db.add(ShopMembership(shop_id=shop2.id, user_id=merchant.id, role="owner", status="active"))
            db.add(ShopDomain(
                shop_id=shop2.id,
                hostname="gadget-zone.arisestore.com",
                domain_type="platform_subdomain",
                verification_status="verified",
                routing_status="active",
                verified_at=datetime.now(timezone.utc)
            ))
            if tech_theme:
                db.add(ShopThemeSetting(
                    shop_id=shop2.id,
                    theme_id=tech_theme.id,
                    theme_version=tech_theme.version,
                    settings_json=tech_theme.configuration_schema
                ))
            if growth_plan:
                db.add(Subscription(
                    shop_id=shop2.id,
                    plan_id=growth_plan.id,
                    status="active",
                    billing_interval="monthly",
                    starts_at=datetime.now(timezone.utc),
                    current_period_start=datetime.now(timezone.utc),
                    current_period_end=datetime.now(timezone.utc) + timedelta(days=30)
                ))

            cat_audio = Category(shop_id=shop2.id, name="Wireless Earbuds & Audio", slug="audio", sort_order=1)
            cat_watch = Category(shop_id=shop2.id, name="Smartwatches & Fitness", slug="smartwatches", sort_order=2)
            db.add_all([cat_audio, cat_watch])
            db.flush()

            gp1 = Product(
                shop_id=shop2.id,
                name="SonicPro ANC Wireless Bluetooth Earbuds",
                slug="sonicpro-anc-wireless-earbuds",
                description="Active Noise Cancellation with 40dB reduction, 36hr battery case, and IPX5 water resistance.",
                price_minor=320000, # ৳3,200
                compare_at_price_minor=420000,
                currency="BDT",
                sku="GZ-EAR-01",
                stock_quantity=60,
                track_inventory=True,
                is_featured=True,
                status="active",
                published_at=datetime.now(timezone.utc)
            )
            db.add(gp1)
            db.flush()
            db.add(ProductCategory(product_id=gp1.id, category_id=cat_audio.id))
            db.add(ProductImage(product_id=gp1.id, image_url="https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80", is_primary=True, sort_order=0))

            gp2 = Product(
                shop_id=shop2.id,
                name="PulseFit Ultra AMOLED Bluetooth Calling Smartwatch",
                slug="pulsefit-ultra-amoled-smartwatch",
                description="1.96-inch HD AMOLED screen with always-on display, heart-rate tracking, SpO2 sensor and 100+ sports modes.",
                price_minor=450000, # ৳4,500
                compare_at_price_minor=550000,
                currency="BDT",
                sku="GZ-WTC-02",
                stock_quantity=28,
                track_inventory=True,
                is_featured=True,
                status="active",
                published_at=datetime.now(timezone.utc)
            )
            db.add(gp2)
            db.flush()
            db.add(ProductCategory(product_id=gp2.id, category_id=cat_watch.id))
            db.add(ProductImage(product_id=gp2.id, image_url="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80", is_primary=True, sort_order=0))

        db.commit()
        print("Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_all()

