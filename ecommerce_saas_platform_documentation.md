# Multi-Tenant E-commerce SaaS Platform
## Product Requirements, System Design, and Implementation Documentation

**Document version:** 1.0  
**Date:** 24 October 2026  
**Status:** Initial product and technical specification  
**Working product name:** TBD  
**Primary market:** Bangladesh, with architecture that can support other markets later

---

## 1. Executive Summary

This document specifies a multi-tenant Software-as-a-Service (SaaS) e-commerce platform. Merchants can register, create an online shop, choose from multiple storefront themes, manage products and categories, receive customer orders, and publish their store under a platform-provided URL. Merchants can optionally connect a custom domain and pay for a monthly or annual subscription.

The platform runs a shared application and infrastructure while logically isolating each merchant's data. It includes a public marketing website, merchant dashboard, customer-facing storefronts, platform administration tools, subscription management, and domain management.

The recommended initial business model is a hybrid SaaS subscription: merchants pay recurring fees for hosting and store management, with optional paid upgrades such as premium themes, advanced automation, and additional services.

This is a planning specification, not a claim that the system has already been implemented. Product decisions, prices, gateway availability, legal requirements, and infrastructure choices must be validated before launch.

## 2. Product Vision

### 2.1 Vision

Make it possible for a small business to launch and manage a professional online store without hiring a developer or maintaining its own e-commerce infrastructure.

### 2.2 Problem Statement

Many small merchants sell through social media or informal channels and may lack the time, skills, or budget to build and maintain a dedicated online store. Existing solutions may be too complex, too expensive, or insufficiently adapted to local workflows.

### 2.3 Proposed Solution

Provide a self-service platform where a merchant can:

1. Register an account.
2. Create a shop and choose a unique shop name.
3. Select a storefront theme.
4. Add products, images, categories, variants, and stock.
5. Configure store information, delivery options, and checkout.
6. Publish using a platform URL.
7. Optionally connect a custom domain.
8. Receive, process, and track orders.
9. Pay for a subscription and manage renewal.

### 2.4 Target Customers

- Facebook and Instagram sellers moving to a dedicated website.
- Clothing and fashion stores.
- Electronics and gadget sellers.
- Cosmetics and skincare shops.
- Grocery and household goods businesses.
- Small retailers and local brands.
- Growing merchants who need inventory and order workflows.

### 2.5 Product Principles

- Simple onboarding and low technical barriers.
- Mobile-first customer storefronts.
- Fast pages and search-engine-friendly product URLs.
- Strong tenant isolation and secure access controls.
- Theme changes must not destroy business data.
- Transparent pricing, limits, and subscription states.
- Reliable backups and recoverable deployments.
- Localized customer experience, including Bangla and English where practical.

## 3. Goals and Non-Goals

### 3.1 Initial Goals

- Allow a merchant to create a shop without developer assistance.
- Provide at least three reusable storefront themes.
- Support products, categories, images, variants, stock, and orders.
- Publish shops under platform-managed URLs.
- Provide a merchant dashboard and platform admin panel.
- Support subscription plans and controlled activation.
- Provide cash-on-delivery checkout for the initial market.
- Enforce strict separation of merchant data.
- Design the platform so custom domains can be added without redesigning the data model.

### 3.2 Non-Goals for the First Release

Unless required by initial pilot customers, the first release will not attempt to provide:

- A full drag-and-drop page builder.
- A marketplace where customers buy from multiple merchants in one cart.
- Separate infrastructure for every merchant.
- Full enterprise resource planning (ERP).
- International tax and compliance support for every country.
- Native mobile apps.
- Advanced AI customer service or marketing automation.
- Automated custom-domain provisioning before platform subdomains are stable.

These may be added in later phases.

## 4. User Roles and Permissions

### 4.1 Platform Roles

**Platform Administrator**
- Manage merchants and shops.
- Configure subscription plans and platform settings.
- Review payment and subscription events.
- Suspend or reactivate shops under documented policy.
- Manage theme catalog and platform-wide announcements.
- View platform-level operational metrics.
- Access sensitive customer data only when required for support or operations and with audit logging.

**Platform Support Agent** (optional)
- Assist merchants.
- View permitted shop metadata.
- Perform only explicitly authorized support actions.
- No unrestricted access to payment secrets or passwords.

### 4.2 Shop Roles

**Shop Owner**
- Full access to their shop configuration, products, orders, customers, team, and subscription.

**Shop Manager** (later phase)
- Manage products, categories, inventory, and orders.
- Cannot transfer ownership or change billing unless explicitly permitted.

**Shop Staff** (later phase)
- Limited operational access, such as processing orders.

**Customer**
- Browse published stores.
- Add items to a cart.
- Place orders.
- Optionally view order status or manage an account if customer accounts are enabled.

Authorization must be checked on the server for every protected operation. Hiding a button in the frontend is not authorization.

## 5. Product Scope and Functional Requirements

Priority labels:
- **P0:** Required for the first usable release.
- **P1:** Important after the MVP.
- **P2:** Later enhancement.

### 5.1 Public Marketing Website

- **P0** Homepage describing the platform and benefits.
- **P0** Pricing and plan comparison.
- **P0** Theme gallery with previews.
- **P0** Registration, login, password reset, and email verification.
- **P0** Terms, privacy notice, and contact/support page.
- **P1** Case studies, help center, onboarding guides, and testimonials.
- **P1** Public status page.

### 5.2 Account and Authentication

- **P0** Register using email and/or phone, based on the chosen onboarding policy.
- **P0** Secure password hashing using Argon2id or another currently recommended password-hashing algorithm.
- **P0** Login, logout, session/token refresh, and password reset.
- **P0** Email verification or another suitable account-verification flow.
- **P0** Rate limits for login, password reset, and verification endpoints.
- **P1** Multi-factor authentication for platform administrators.
- **P1** Merchant staff invitations and role-based permissions.

Do not store plaintext passwords. Do not put long-lived secrets in browser storage without evaluating the security implications. Prefer secure, HttpOnly, SameSite cookies for browser sessions where the architecture permits.

### 5.3 Shop Creation and Setup

- **P0** Create a shop with a display name and unique slug.
- **P0** Check slug availability before creation and enforce uniqueness in the database.
- **P0** Create default settings and a selected default theme.
- **P0** Provide a guided onboarding checklist.
- **P0** Allow a draft store to be configured before public launch.
- **P0** Support draft, published, suspended, and archived states.
- **P1** Support changing a slug with redirects from the old URL, where safe and appropriate.
- **P1** Allow multiple shops per account only if the business model and plans support it.

A shop slug should be normalized, length-limited, and protected against reserved words such as `admin`, `api`, `login`, `support`, and platform-owned routes.

### 5.4 Product Management

- **P0** Create, read, update, and archive products.
- **P0** Fields: name, slug, description, price, status, SKU (optional for simple products), stock quantity, and timestamps.
- **P0** Upload multiple product images and choose a primary image.
- **P0** Assign products to one or more categories if the product model permits it.
- **P0** Set product visibility: draft, active, archived.
- **P0** Validate price, stock, text lengths, and image types/sizes.
- **P1** Product variants such as size, color, or material.
- **P1** Compare-at price, sale price, barcode, weight, and dimensions.
- **P1** Bulk import/export through CSV.
- **P1** Product search, filters, sorting, and pagination.
- **P2** Bundles, kits, digital products, and advanced product rules.

Store money as integer minor units (for example, poisha) or use an exact decimal database type. Do not use floating-point arithmetic for financial values.

### 5.5 Category Management

- **P0** Create, update, reorder, and archive categories.
- **P0** Each category belongs to one shop.
- **P0** Category name and URL slug must be unique within a shop.
- **P1** Nested categories and category images.
- **P1** Category SEO title and description.

Prevent circular parent-child relationships if nested categories are supported.

### 5.6 Theme System and Store Customization

- **P0** Theme gallery with preview images and demo storefronts.
- **P0** At least three initial themes: fashion, general store, and electronics/cosmetics-oriented layout.
- **P0** Assign a theme to a shop.
- **P0** Configure logo, brand colors, typography choices, banner, contact details, and supported homepage sections.
- **P0** Render all themes using the same product, category, cart, and order domain models.
- **P0** Preserve products, categories, orders, and customer records when the theme changes.
- **P1** More themes for grocery, beauty, premium brands, and other verticals.
- **P1** Theme-specific section ordering and content blocks.
- **P2** Advanced visual page builder.

Themes should be versioned and have a documented configuration schema. A theme should not be allowed to execute arbitrary merchant-provided code. Sanitize or constrain custom content and URLs.

### 5.7 Storefront and Customer Shopping

- **P0** Responsive homepage, product listing, category listing, product details, cart, and checkout pages.
- **P0** Search, category navigation, product images, price, availability, and clear calls to action.
- **P0** Server-rendered or statically rendered public pages where appropriate for SEO and performance.
- **P0** Store contact and policy pages.
- **P0** Customizable store name, logo, colors, and metadata.
- **P0** Cart validation against current price and stock before order creation.
- **P1** Wishlist, customer accounts, reviews, coupons, and recently viewed items.
- **P1** Product recommendations and analytics integrations.
- **P2** Multi-language storefront content management.

A cart is not authoritative for price or inventory. Recompute totals and validate availability on the server during checkout.

### 5.8 Checkout and Orders

- **P0** Guest checkout.
- **P0** Capture customer name, phone, delivery address, and optional email.
- **P0** Delivery charge and order total calculation.
- **P0** Cash-on-delivery payment method.
- **P0** Create order and order-item snapshots transactionally.
- **P0** Generate a human-readable order number unique within the shop or globally.
- **P0** Merchant order list, detail view, and status updates.
- **P0** Customer order confirmation page.
- **P1** Online payments, coupons, order cancellation rules, return/refund workflow, and notification integrations.
- **P1** Courier integrations and shipment tracking.
- **P2** Partial fulfilment, split shipments, and advanced returns.

Suggested order states:

`pending`, `confirmed`, `processing`, `ready_to_ship`, `shipped`, `delivered`, `cancelled`, `returned`, `refunded`.

Define valid transitions in backend logic. Do not allow arbitrary status changes that bypass inventory or payment rules.

Order items must preserve a snapshot of the product name, SKU, unit price, and relevant variant information at the time of purchase. Later product edits must not rewrite historical order records.

### 5.9 Inventory

- **P0** Track stock for simple products.
- **P0** Prevent negative stock through transactional checks.
- **P1** Track stock movements and adjustment reasons.
- **P1** Reserve inventory during checkout if the payment model requires it.
- **P1** Support variant-level inventory.
- **P2** Multiple warehouses and stock locations.

Choose and document the stock policy for pending and cancelled orders. Use database transactions or atomic updates to avoid overselling under concurrent checkout requests.

### 5.10 Subscription and Billing

- **P0** Plan catalog with prices, billing intervals, product limits, and feature flags.
- **P0** Associate a subscription with a shop.
- **P0** Support trial, active, past-due, suspended, cancelled, and expired states.
- **P0** Show current plan, renewal date, usage, and payment history.
- **P0** Verify payment server-side before granting paid entitlements.
- **P0** Record payment events idempotently.
- **P1** Automatic renewals where supported by the selected provider.
- **P1** Invoices, receipts, refunds, and plan changes.
- **P1** Grace period and notification rules.
- **P2** Proration and complex billing schedules.

Never trust a success redirect from the payment gateway as proof of payment. Verify through a server-to-server API or authenticated webhook, check amount and currency, and make event handling idempotent.

### 5.11 Custom Domains

- **P1** Merchant can submit a custom domain.
- **P1** Show the DNS records required for verification and routing.
- **P1** Verify domain control.
- **P1** Ensure a domain can map to only one active shop.
- **P1** Provision HTTPS and track certificate status.
- **P1** Support disconnecting a domain safely.
- **P1** Detect invalid, duplicate, or unsafe hostnames.
- **P2** Automated provider APIs for DNS and certificate management.

Launch first with platform-managed subdomains if time is limited. Do not mark a custom domain as active until ownership and routing are verified. Prevent domain takeover by removing stale mappings when a merchant disconnects a domain.

### 5.12 Notifications

- **P0** In-dashboard order notifications.
- **P1** Email order and subscription notifications.
- **P1** SMS or messaging notifications through approved providers.
- **P1** Configurable merchant notification preferences.
- **P2** WhatsApp, social messaging, and AI-assisted support integrations.

Keep notification delivery asynchronous. Store delivery status and retry transient failures without duplicating the underlying order or payment.

### 5.13 Platform Administration

- **P0** View and search merchants and shops.
- **P0** Inspect subscription status and payment events.
- **P0** Activate, suspend, and reactivate shops with reason logging.
- **P0** Manage plans and theme availability.
- **P0** View basic operational metrics.
- **P1** Audit logs, support notes, and abuse reports.
- **P1** Feature flags and maintenance mode.
- **P2** Advanced cohort and revenue analytics.

## 6. Suggested Initial Pricing

The following figures are hypotheses for testing in Bangladesh, not validated market benchmarks.

| Plan | Illustrative monthly price | Suggested limits and features |
|---|---:|---|
| Starter | ৳499 | Up to 100 products, platform URL, standard themes, basic order management |
| Growth | ৳999 | Up to 1,000 products, custom-domain connection, all standard themes, expanded customization |
| Premium | ৳1,999 | Higher or unlimited product limit subject to fair-use policy, advanced customization, priority support |

Recommended commercial approach:
- Offer monthly and annual billing.
- Offer a limited trial or launch promotion.
- Clearly state taxes, gateway fees, usage limits, and what happens when a subscription expires.
- Do not promise “unlimited” storage, bandwidth, or products without enforceable fair-use terms.
- Validate pricing with interviews and pilot merchants before public launch.

Possible add-ons include premium themes, SMS credits, courier integrations, advanced analytics, custom setup, and automation features.

## 7. Recommended Technology Stack

### 7.1 Frontend

- **Next.js + React + TypeScript** for the marketing website, storefronts, and merchant dashboard.
- **Tailwind CSS** for styling.
- A consistent component library and accessible design tokens.
- Server-side rendering or static generation for SEO-sensitive storefront pages.

The dashboard and public storefront may be separate Next.js applications or separate application areas in one repository. Choose based on team size and deployment complexity.

### 7.2 Backend

- **FastAPI** for REST APIs.
- **Pydantic** for request and response validation.
- **SQLAlchemy** or SQLModel for database access.
- **Alembic** for schema migrations.
- A maintained authentication library or well-reviewed implementation for sessions and tokens.
- OpenAPI-generated API documentation.

### 7.3 Data and Infrastructure

- **PostgreSQL** as the recommended primary database; MySQL is also viable if preferred.
- **Redis** for cache, rate limits, and task coordination where appropriate.
- **Celery** or an equivalent worker system for asynchronous tasks.
- **S3-compatible object storage** for product images and generated assets.
- **Cloudflare or an equivalent provider** for DNS, CDN, and edge protection where appropriate.
- **Docker** for reproducible development and deployment.
- CI/CD pipeline for tests, migrations, and deployment.

### 7.4 Observability

- Structured application logs.
- Error tracking.
- Health and readiness endpoints.
- Metrics for latency, error rate, queue backlog, database saturation, and storage.
- Alerts for failed payments, certificate errors, backup failures, and elevated 5xx responses.

## 8. High-Level Architecture

```text
Merchants
   |
   v
Marketing Website / Merchant Dashboard
   |
   v
API Gateway or Reverse Proxy
   |
   +-----------------------------+
   |          FastAPI            |
   |                             |
   | Auth & Accounts             |
   | Shop & Domain Management    |
   | Themes & Store Settings     |
   | Products & Categories       |
   | Cart, Checkout & Orders     |
   | Inventory                   |
   | Subscription & Payments     |
   | Admin & Audit               |
   +-----------------------------+
       |           |          |
       v           v          v
  PostgreSQL     Redis     Object Storage
       |           |
       |           v
       |       Background Workers
       |           |
       |      Email / SMS / Jobs
       |
       v
  Backup & Recovery

Customer Browser
   |
   v
CDN / Reverse Proxy
   |
   v
Hostname Resolver
   |
   v
Shop + Domain Mapping
   |
   v
Theme Renderer
   |
   v
Products / Categories / Cart / Checkout
```

### 8.1 Multi-Tenancy Model

Use a shared application and shared database with tenant-scoped records for the initial release. Each shop-owned resource must be tied to a shop.

Every service that queries shop data must enforce tenant scope. Consider PostgreSQL Row-Level Security as a defence-in-depth measure. A `shop_id` field alone does not guarantee isolation.

### 8.2 Request Routing

For a request to `fashion-house.example-platform.com` or `www.fashionhouse.com`:

1. Normalize and validate the incoming hostname.
2. Look up an active verified domain mapping.
3. Resolve the associated shop.
4. Confirm the shop is published and permitted to serve traffic.
5. Load theme and public settings.
6. Fetch only data belonging to the resolved shop.
7. Render the requested route.

Do not trust a client-supplied `shop_id` when the hostname or authenticated membership can determine the tenant. Treat forwarded host headers as trusted only when set by a known reverse proxy.

## 9. Repository Structure

A monorepo is a practical starting point:

```text
commerce-platform/
├── apps/
│   ├── web/                    # Marketing site and merchant dashboard
│   └── storefront/             # Public storefront rendering
├── services/
│   ├── api/                    # FastAPI application
│   └── worker/                 # Background jobs
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── theme-contracts/        # Theme configuration schemas
│   └── shared-types/           # Shared API/type definitions
├── infrastructure/
│   ├── docker/
│   ├── reverse-proxy/
│   └── deployment/
├── docs/
│   ├── product-requirements.md
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   └── operations.md
├── scripts/
├── .env.example
├── docker-compose.yml
└── README.md
```

A modular monolith is recommended for the first release: one well-structured API deployment with clearly separated modules. Split services only when scaling or team boundaries justify the additional operational complexity.

## 10. Database Design

The following is a conceptual schema. It should be refined into actual migrations after the product model and checkout rules are agreed.

### 10.1 Core Entities

#### `users`
- `id` UUID primary key
- `name`
- `email` nullable, unique where present
- `phone` nullable
- `password_hash`
- `email_verified_at` nullable
- `status`
- `created_at`, `updated_at`

#### `shops`
- `id` UUID primary key
- `owner_user_id` foreign key to users
- `name`
- `slug` unique
- `description` nullable
- `status`
- `default_currency` (initially BDT if the business is Bangladesh-focused)
- `default_locale`
- `published_at` nullable
- `created_at`, `updated_at`

#### `shop_memberships`
- `id`
- `shop_id`
- `user_id`
- `role`
- `status`
- Unique constraint on `(shop_id, user_id)`

This table can be deferred if only owners are supported in the MVP, but it is a clean foundation for team access.

#### `shop_domains`
- `id`
- `shop_id`
- `hostname` normalized and unique
- `domain_type` (`platform_subdomain`, `custom_domain`, or `path_slug`)
- `verification_status`
- `routing_status`
- `verified_at` nullable
- `created_at`, `updated_at`

#### `themes`
- `id`
- `theme_key` unique
- `name`
- `version`
- `configuration_schema`
- `preview_image_url`
- `is_active`

#### `shop_theme_settings`
- `shop_id` primary key or unique foreign key
- `theme_id`
- `theme_version`
- `settings_json`
- `updated_at`

#### `categories`
- `id`
- `shop_id`
- `parent_id` nullable
- `name`
- `slug`
- `description` nullable
- `image_url` nullable
- `sort_order`
- `status`
- Unique constraint on `(shop_id, slug)`

#### `products`
- `id`
- `shop_id`
- `name`
- `slug`
- `description`
- `status`
- `price_minor`
- `compare_at_price_minor` nullable
- `currency`
- `sku` nullable
- `stock_quantity`
- `track_inventory`
- `published_at` nullable
- `created_at`, `updated_at`
- Unique constraint on `(shop_id, slug)`

#### `product_categories`
- `product_id`
- `category_id`
- Composite primary key on `(product_id, category_id)`

The application must verify that product and category records belong to the same shop. Consider database-level constraints or a schema that makes cross-tenant references impossible.

#### `product_images`
- `id`
- `product_id`
- `object_key`
- `alt_text`
- `sort_order`
- `is_primary`
- `created_at`

#### `product_variants` (P1)
- `id`
- `product_id`
- `sku`
- `attributes_json`
- `price_minor` nullable
- `stock_quantity`
- `is_active`

#### `customers`
- `id`
- `shop_id`
- `name`
- `phone`
- `email` nullable
- `created_at`, `updated_at`

Customer personal information should be collected only when necessary and retained only as long as justified by business and legal requirements.

#### `orders`
- `id`
- `shop_id`
- `customer_id` nullable for guest or retention design
- `order_number`
- `status`
- `payment_method`
- `payment_status`
- `subtotal_minor`
- `delivery_fee_minor`
- `discount_minor`
- `total_minor`
- `currency`
- `shipping_address_json`
- `customer_note` nullable
- `created_at`, `updated_at`

Unique constraint on `(shop_id, order_number)`.

#### `order_items`
- `id`
- `order_id`
- `product_id` nullable if product deletion is permitted
- `product_name_snapshot`
- `sku_snapshot`
- `variant_snapshot_json`
- `unit_price_minor`
- `quantity`
- `line_total_minor`

#### `subscriptions`
- `id`
- `shop_id`
- `plan_id`
- `status`
- `starts_at`
- `current_period_start`
- `current_period_end`
- `trial_ends_at` nullable
- `cancelled_at` nullable
- `created_at`, `updated_at`

#### `plans`
- `id`
- `name`
- `price_minor`
- `currency`
- `billing_interval`
- `product_limit`
- `feature_flags_json`
- `is_active`

#### `payments`
- `id`
- `shop_id`
- `subscription_id` nullable
- `provider`
- `provider_reference` unique where appropriate
- `amount_minor`
- `currency`
- `status`
- `verified_at` nullable
- `raw_event_reference` or securely stored event metadata
- `created_at`, `updated_at`

Never store payment-card data unless there is a specific compliant architecture and business need. Prefer a payment provider's hosted checkout.

#### `audit_logs`
- `id`
- `actor_user_id` nullable
- `shop_id` nullable
- `action`
- `resource_type`
- `resource_id`
- `request_id`
- `metadata_json` with sensitive values redacted
- `created_at`

### 10.2 Database Rules

- Use UUIDs or another non-guessable public identifier where useful; IDs are not authorization.
- Add indexes for common queries: `shop_id`, status, created date, slug, order number, and foreign keys.
- Use unique constraints for tenant-scoped slugs and order numbers.
- Use transactions for checkout, stock changes, and payment-state changes.
- Use migrations; do not rely on automatic production schema creation.
- Avoid hard-deleting orders and financial records.
- Define retention and deletion policies for customer personal data.
- Store timestamps in UTC and display them in the merchant's configured timezone.
- Store money as integer minor units or exact decimal values, with explicit currency.

## 11. API Design

Prefix API endpoints with `/api/v1`. Use JSON request and response bodies, consistent error envelopes, pagination, and server-side authorization.

### 11.1 Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register` | Register account |
| POST | `/api/v1/auth/login` | Authenticate |
| POST | `/api/v1/auth/logout` | End session |
| POST | `/api/v1/auth/refresh` | Refresh session/token if used |
| POST | `/api/v1/auth/forgot-password` | Request reset |
| POST | `/api/v1/auth/reset-password` | Complete reset |
| POST | `/api/v1/auth/verify-email` | Verify email |

### 11.2 Shops

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/shops` | Create shop |
| GET | `/api/v1/shops` | List shops accessible to user |
| GET | `/api/v1/shops/{shop_id}` | Get authorized shop |
| PATCH | `/api/v1/shops/{shop_id}` | Update settings |
| POST | `/api/v1/shops/{shop_id}/publish` | Publish shop |
| POST | `/api/v1/shops/{shop_id}/unpublish` | Unpublish shop |

### 11.3 Themes

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/themes` | List active themes |
| GET | `/api/v1/themes/{theme_key}` | Get theme details |
| PUT | `/api/v1/shops/{shop_id}/theme` | Assign theme |
| PATCH | `/api/v1/shops/{shop_id}/theme-settings` | Update theme configuration |

### 11.4 Products and Categories

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/api/v1/shops/{shop_id}/products` | List/create products |
| GET/PATCH/DELETE | `/api/v1/shops/{shop_id}/products/{product_id}` | Read/update/archive product |
| GET/POST | `/api/v1/shops/{shop_id}/categories` | List/create categories |
| PATCH/DELETE | `/api/v1/shops/{shop_id}/categories/{category_id}` | Update/archive category |
| POST | `/api/v1/shops/{shop_id}/products/{product_id}/images` | Request image upload or register uploaded image |

Use signed uploads for object storage when possible. Validate file type, size, dimensions, and content; do not trust the filename or client MIME type alone.

### 11.5 Public Storefront

Prefer hostname-based tenant resolution for public storefront endpoints.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/public/store` | Public store settings for resolved hostname |
| GET | `/api/v1/public/products` | Published products |
| GET | `/api/v1/public/products/{slug}` | Product details |
| GET | `/api/v1/public/categories` | Public categories |
| POST | `/api/v1/public/cart/validate` | Validate cart items and totals |
| POST | `/api/v1/public/orders` | Place an order |

Public endpoints must return only published, non-sensitive data.

### 11.6 Orders

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/shops/{shop_id}/orders` | List shop orders |
| GET | `/api/v1/shops/{shop_id}/orders/{order_id}` | Get order |
| PATCH | `/api/v1/shops/{shop_id}/orders/{order_id}/status` | Change valid order status |
| POST | `/api/v1/shops/{shop_id}/orders/{order_id}/cancel` | Cancel order under policy |

### 11.7 Billing and Domains

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/plans` | List purchasable plans |
| POST | `/api/v1/shops/{shop_id}/subscriptions/checkout` | Start subscription payment |
| GET | `/api/v1/shops/{shop_id}/subscription` | Get current subscription |
| POST | `/api/v1/webhooks/payments/{provider}` | Receive provider event |
| POST | `/api/v1/shops/{shop_id}/domains` | Add custom domain |
| POST | `/api/v1/shops/{shop_id}/domains/{domain_id}/verify` | Verify domain |
| DELETE | `/api/v1/shops/{shop_id}/domains/{domain_id}` | Disconnect domain |

Webhook endpoints must validate provider signatures or use the provider's documented secure verification method. Use idempotency keys and unique provider event identifiers to avoid duplicate processing.

### 11.8 API Conventions

- Return appropriate HTTP status codes.
- Validate all input with Pydantic.
- Use pagination for list endpoints.
- Return stable machine-readable error codes.
- Apply rate limits to authentication, checkout, and public search endpoints.
- Log request IDs, but never log passwords, full payment secrets, or unnecessary personal information.
- Generate and maintain OpenAPI documentation.
- Version breaking API changes.
- Use idempotency for operations that may be retried, especially checkout and payment events.

## 12. Theme Configuration Contract

A theme should read a validated configuration object rather than rely on hard-coded per-shop conditions.

Illustrative configuration:

```json
{
  "theme_key": "fashion-modern",
  "version": "1.0.0",
  "brand": {
    "logo_url": null,
    "primary_color": "#222222",
    "accent_color": "#D9A5A5",
    "font_family": "system"
  },
  "layout": {
    "header_variant": "centered",
    "product_grid_columns_desktop": 4,
    "show_announcement_bar": true
  },
  "homepage_sections": [
    {"type": "hero", "enabled": true},
    {"type": "featured_categories", "enabled": true},
    {"type": "featured_products", "enabled": true},
    {"type": "newsletter", "enabled": false}
  ]
}
```

This is an example only. Validate the configuration against a schema. Restrict section types, URLs, and style values. A theme update should include migration or fallback logic for old configuration versions.

## 13. Core User Flows

### 13.1 Merchant Onboarding

1. Merchant registers and verifies their account.
2. Merchant enters shop name and slug.
3. System validates slug uniqueness and reserved words.
4. System creates the shop in draft or trial state.
5. Merchant selects a theme.
6. Merchant uploads a logo and adds initial products.
7. Merchant configures delivery and checkout.
8. Merchant previews the shop.
9. Merchant completes any required subscription payment.
10. Merchant publishes the shop.
11. System displays the shop URL and onboarding checklist.

### 13.2 Theme Change

1. Merchant opens theme gallery.
2. Merchant previews a theme using their existing content.
3. Merchant selects the theme.
4. Backend verifies permission and plan eligibility.
5. Theme assignment and validated settings are saved.
6. Storefront cache is invalidated.
7. The storefront renders with the new theme.
8. Products, categories, orders, and customers remain unchanged.

### 13.3 Customer Checkout

1. Customer opens a store.
2. Customer selects product options and quantities.
3. Client submits cart items to the server.
4. Server resolves the shop and validates product publication, variants, prices, stock, and delivery rules.
5. Server calculates totals.
6. Server creates the order and item snapshots in a transaction.
7. Inventory is updated or reserved according to the documented policy.
8. Confirmation is returned.
9. Background jobs send notifications.
10. Merchant processes the order.

For online payments, payment authorization and order confirmation require an explicit state machine and idempotent handling of callbacks. Do not assume that a browser returning from a payment page proves settlement.

### 13.4 Custom Domain Setup

1. Merchant enters a domain.
2. Backend normalizes the hostname and checks uniqueness.
3. Platform displays required DNS records.
4. Merchant creates DNS records with their domain provider.
5. Platform checks domain ownership and routing.
6. Platform enables TLS.
7. Platform marks the domain active only after all checks pass.
8. The hostname resolver maps requests to the merchant's shop.

### 13.5 Subscription Renewal and Expiration

1. A renewal attempt or payment request is initiated.
2. Payment provider sends a verified event.
3. Backend records the event idempotently.
4. Subscription status and period are updated transactionally.
5. Merchant receives a notification.
6. Failed payments enter `past_due` and follow the configured grace-period policy.
7. Expired shops are restricted according to policy, while merchant access to billing and data export remains available where appropriate.

## 14. Security Requirements

Security is a release requirement, not a later enhancement.

### 14.1 Tenant Isolation

- Every shop-owned query must be scoped to the authorized shop.
- Resolve membership and permissions server-side.
- Do not accept a `shop_id` from the client as proof of access.
- Check ownership of every referenced product, category, order, image, domain, and subscription.
- Add tests that deliberately attempt cross-tenant access.
- Consider PostgreSQL Row-Level Security as additional protection.

### 14.2 Authentication and Sessions

- Use modern password hashing such as Argon2id.
- Rate-limit authentication and recovery endpoints.
- Use secure, HttpOnly, SameSite cookies where suitable.
- Apply CSRF protection when cookie-based authentication requires it.
- Expire and rotate sessions according to risk.
- Require stronger authentication for platform administrators.
- Never return password hashes or secret tokens through APIs.

### 14.3 Input and Web Security

- Validate request bodies, query parameters, file uploads, URLs, and domain names.
- Escape user content in rendered HTML.
- Prevent SQL injection by using parameterized queries/ORM methods correctly.
- Apply a Content Security Policy and suitable security headers.
- Restrict CORS to expected origins.
- Protect against SSRF if any server-side URL fetching feature is added.
- Avoid arbitrary HTML/JavaScript in merchant-controlled theme settings.
- Protect checkout from automated abuse and excessive requests.

### 14.4 Payments

- Verify webhook signatures and provider transaction details.
- Verify amount, currency, merchant reference, and payment state.
- Use idempotency keys and unique provider event identifiers.
- Do not store raw card details.
- Restrict access to gateway credentials.
- Redact secrets from logs.
- Reconcile provider transactions with internal records.

### 14.5 Domain Security

- Verify control before activating a custom domain.
- Normalize internationalized domain names consistently if supported.
- Reject malformed hostnames and reserved platform domains.
- Prevent duplicate domain mappings.
- Trust forwarding headers only from known proxies.
- Remove stale mappings promptly.
- Avoid serving a shop on an unverified hostname.

### 14.6 Data Protection

- Collect only necessary customer data.
- Restrict access by role and log privileged actions.
- Encrypt data in transit and use appropriate encryption at rest.
- Set data retention and deletion rules.
- Provide an appropriate merchant data export process.
- Do not expose one merchant's customer list to another merchant.
- Prepare privacy and terms documents reviewed for the applicable jurisdiction.

## 15. Performance and Scalability

### 15.1 Initial Performance Goals

These are targets to test, not guarantees:

- Public storefront pages should feel responsive on common mobile connections.
- Target p95 API response time below 300 ms for simple database-backed reads under a defined pilot load, excluding external providers.
- Avoid unbounded product and order list responses.
- Optimize images and serve them through object storage/CDN.
- Monitor Core Web Vitals and real-user performance when possible.

### 15.2 Caching

Potential cache targets:
- Public shop configuration.
- Theme metadata.
- Published product and category pages.
- Static assets and optimized images.

Cache keys must include the resolved tenant/domain and relevant content version. Never allow cached responses to cross tenant boundaries. Invalidate or version caches after product, theme, or publication changes.

Do not cache sensitive dashboard or customer data publicly.

### 15.3 Database Performance

- Add indexes based on observed query plans.
- Paginate large result sets.
- Use transactions for multi-record business operations.
- Avoid N+1 ORM queries.
- Monitor slow queries and connection-pool saturation.
- Define retention policies for event and audit tables.

### 15.4 Growth Strategy

Start with a modular monolith. Scale stateless API and storefront instances horizontally, use managed or properly maintained database infrastructure, and add worker capacity as jobs increase. Separate services only when there is a measurable reason.

## 16. Deployment and Environments

### 16.1 Environments

Maintain separate:
- Local development
- Automated test/CI
- Staging
- Production

Use separate databases, credentials, payment gateway modes, storage buckets, and domain namespaces for non-production environments.

### 16.2 Docker Services

A local development environment may include:
- `web`
- `storefront`
- `api`
- `worker`
- `postgres`
- `redis`
- `object-storage` emulator (optional)
- `reverse-proxy` (optional)

Production may use managed equivalents rather than running every service on one VPS.

### 16.3 Environment Variables

Illustrative `.env.example` keys:

```dotenv
APP_ENV=development
APP_SECRET_KEY=replace-me
DATABASE_URL=postgresql+psycopg://app:password@postgres:5432/commerce
REDIS_URL=redis://redis:6379/0
PUBLIC_PLATFORM_DOMAIN=example.test
STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
PAYMENT_PROVIDER=
PAYMENT_API_KEY=
PAYMENT_WEBHOOK_SECRET=
EMAIL_PROVIDER_API_KEY=
```

These are placeholders. Never commit real credentials. Validate required variables on application startup. Use a secret manager or protected deployment secrets in production.

### 16.4 CI/CD

A release pipeline should:
1. Install locked dependencies.
2. Run formatting and linting.
3. Run unit and integration tests.
4. Run tenant-isolation and authorization tests.
5. Build containers.
6. Scan dependencies and images.
7. Apply reviewed database migrations.
8. Deploy to staging.
9. Run smoke tests.
10. Promote to production with a rollback plan.

Avoid destructive migrations that require downtime without a migration plan. Keep backups before high-risk schema changes.

## 17. Testing Strategy

### 17.1 Unit Tests

- Slug normalization and reserved-word rules.
- Pricing and discount calculations.
- Subscription state transitions.
- Theme configuration validation.
- Order status transition rules.
- Inventory update logic.

### 17.2 Integration Tests

- Database transactions and migrations.
- Product/category CRUD.
- Checkout and order creation.
- Payment webhook verification.
- Domain verification state changes.
- Image upload authorization.
- Background job retries.

### 17.3 Tenant-Isolation Tests

Create two shops and attempt to access each other's:
- Products.
- Categories.
- Orders.
- Customers.
- Images.
- Domains.
- Subscription details.
- Theme settings.

All unauthorized cross-tenant attempts must fail, including attempts using guessed IDs.

### 17.4 End-to-End Tests

- Register and create a shop.
- Select a theme and publish the store.
- Add a product and place a COD order.
- Process an order from the dashboard.
- Start and verify a subscription payment in test mode.
- Connect a test custom domain in staging when the feature is implemented.
- Test expired and suspended store behavior.

### 17.5 Non-Functional Tests

- Load test public storefronts and checkout.
- Test backup restoration.
- Test accessibility and keyboard navigation.
- Test responsive layouts on common mobile sizes.
- Test failure of payment, email, storage, and queue dependencies.
- Test security headers and rate limits.

## 18. Monitoring, Backup, and Recovery

### 18.1 Monitoring

Track:
- API request volume, latency, and errors.
- Storefront response times.
- Database CPU, storage, locks, and connections.
- Worker queue length and failure rate.
- Payment success/failure and webhook delay.
- Domain verification and TLS errors.
- Storage usage.
- Subscription churn and active shops.

### 18.2 Backups

- Automate database backups.
- Use point-in-time recovery if supported and justified.
- Back up required configuration and critical metadata.
- Understand object storage versioning and deletion recovery.
- Encrypt backups and restrict access.
- Set and document recovery point objective (RPO) and recovery time objective (RTO).
- Perform periodic restore drills; a backup that has never been restored is unverified.

Illustrative early targets to evaluate:
- RPO: 24 hours or better.
- RTO: 8 hours or better.

Choose targets based on business needs and infrastructure budget.

## 19. Localization and Bangladesh-Specific Requirements

- Support Bangla and English interface text.
- Use BDT as the initial default currency if Bangladesh is the first market.
- Store phone numbers in a normalized format while preserving display formatting.
- Support cash-on-delivery workflows.
- Allow configurable delivery charges by area or rule.
- Investigate local payment gateways and their merchant requirements.
- Investigate courier APIs and their service coverage.
- Make privacy, refund, cancellation, consumer-protection, tax, and business obligations subject to local professional review.
- Do not assume that every gateway supports recurring subscriptions or automatic card/token billing; verify current provider capabilities.
- Ensure Bangla product content is searchable and rendered correctly.

## 20. Analytics and Success Metrics

### 20.1 Product Metrics

- Signup-to-shop-creation conversion.
- Time to first product.
- Time to publish first store.
- Percentage of shops receiving a first order.
- Merchant activation rate.
- Theme preview-to-selection rate.
- Custom-domain activation rate.
- Weekly and monthly active merchants.

### 20.2 Business Metrics

- Monthly recurring revenue (MRR).
- Annual recurring revenue (ARR), when meaningful.
- Trial-to-paid conversion.
- Churn and renewal rate.
- Average revenue per shop.
- Payment failure rate.
- Support requests per active shop.
- Gross margin per subscription tier.

### 20.3 Reliability Metrics

- API and storefront availability.
- p95/p99 latency.
- Error rates.
- Queue delay.
- Backup success and restore-test results.
- Payment webhook processing delay.

Collect only the analytics needed for product and operational decisions. Avoid collecting sensitive customer information for general analytics.

## 21. Roadmap

### Phase 0 — Discovery and Foundation
- Interview prospective merchants.
- Validate product scope and pricing.
- Confirm brand, domain, and business terms.
- Choose deployment and payment approach.
- Create UX flows and a clickable prototype.
- Define data model and security requirements.

### Phase 1 — MVP
- Authentication.
- Shop creation.
- Theme gallery and three themes.
- Product and category management.
- Storefront and cart.
- COD checkout and orders.
- Merchant dashboard.
- Basic platform admin.
- Platform URL publishing.
- Basic monitoring and backups.

### Phase 2 — Paid Launch
- Subscription plans and payment verification.
- Usage limits and entitlement enforcement.
- Renewal, grace period, suspension, and recovery workflows.
- Merchant billing history.
- Support and audit tooling.

### Phase 3 — Domains and Store Operations
- Custom domains and verification.
- TLS automation.
- Product variants and inventory history.
- Coupons and delivery rules.
- Email/SMS notifications.
- Analytics and SEO improvements.

### Phase 4 — Automation and Growth
- Courier integrations.
- Payment integrations for customer orders.
- Messaging automation.
- Abandoned-cart recovery.
- AI customer support.
- Advanced reporting and marketing integrations.

The dates and durations should be set after team capacity, integration dependencies, and launch scope are known.

## 22. MVP Acceptance Criteria

The MVP is ready for a controlled pilot when all of the following are true:

1. A user can register and authenticate securely.
2. A user can create a shop with a unique URL slug.
3. The system prevents reserved or duplicate slugs.
4. A merchant can choose from at least three themes.
5. A merchant can add, edit, and archive products.
6. A merchant can create and manage categories.
7. A merchant can upload product images securely.
8. A merchant can preview and publish a store.
9. A customer can browse products on mobile and desktop.
10. A customer can place a COD order.
11. A merchant can view and process orders.
12. Historical order item prices remain unchanged after product edits.
13. Tenant-isolation tests pass for all major resources.
14. The platform admin can inspect shops and subscription states.
15. Shop publication respects trial/subscription policy.
16. Errors are logged without leaking secrets.
17. Database backups run and a restore test has succeeded.
18. Terms, privacy, support, and basic operational procedures are available.

Custom domains and automated recurring billing can be deferred if the MVP explicitly communicates their absence.

## 23. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cross-tenant data exposure | Critical | Centralized authorization, tenant-scoped queries, RLS where appropriate, isolation tests |
| Unverified payment callbacks | Financial loss | Provider verification, signatures, amount/currency checks, idempotency |
| Overselling inventory | Merchant/customer disputes | Transactions, atomic stock updates, documented reservation policy |
| Theme complexity | Delayed launch | Start with reusable themes and a limited configuration schema |
| Custom-domain takeover | Security and reputational damage | Ownership verification, unique mappings, stale mapping cleanup |
| Low willingness to pay | Weak recurring revenue | Merchant interviews, pilots, transparent pricing experiments |
| Hosting costs exceed revenue | Poor margins | Usage limits, monitoring, image optimization, cost allocation |
| Poor SEO or slow pages | Low store traffic | SSR/SSG where appropriate, optimized images, metadata, performance tests |
| Failed notifications | Missed orders | Queue retries, delivery tracking, dashboard fallback |
| Subscription disputes | Churn and support burden | Clear renewal/cancellation terms, payment history, grace policy |
| Data loss | Business disruption | Automated backups, restore drills, recovery objectives |
| Scope creep | Late launch | P0/P1/P2 priorities and phased roadmap |

## 24. Open Decisions

The following should be resolved before implementation is considered final:

1. Final product and company name.
2. Whether the first release uses subdomains, path-based URLs, or both.
3. Whether multiple shops per account are permitted.
4. Whether customer accounts are needed for MVP.
5. Whether subscription payment is automated or manually verified at launch.
6. Which payment provider is suitable for merchant subscriptions.
7. Whether customer online payments are in MVP or COD-only.
8. Which courier integrations, if any, are required at launch.
9. Exact subscription limits and prices.
10. Data retention, deletion, and export policy.
11. Hosting budget, traffic expectations, and backup requirements.
12. Whether the initial themes are custom-designed or based on an existing component system.
13. Whether merchant staff accounts are part of MVP.
14. What happens to a shop and its data after cancellation or non-payment.

## 25. Recommended Initial Decisions

Unless discovery reveals a strong reason to change, use these defaults:

- **Model:** Multi-tenant SaaS.
- **Commercial model:** Monthly/annual subscription with optional add-ons.
- **Frontend:** Next.js, React, TypeScript, and Tailwind CSS.
- **Backend:** FastAPI.
- **Database:** PostgreSQL.
- **Architecture:** Modular monolith.
- **Tenant model:** Shared database with strict tenant scoping and additional database safeguards.
- **Initial URLs:** Platform-managed subdomains; path-based links may be offered as an alternative.
- **Initial checkout:** Guest checkout with cash on delivery.
- **Initial themes:** Three polished, reusable themes.
- **Custom domains:** Phase 3, after subdomain routing is stable.
- **Payments:** Choose only after verifying provider onboarding, webhook security, settlement, refund, and recurring-billing capabilities.
- **Deployment:** Docker with staging and production environments.
- **Quality gates:** Automated tests, tenant isolation checks, backups, monitoring, and a restore drill before public launch.

## 26. Glossary

- **SaaS:** Software delivered as a service, typically for recurring payment.
- **Multi-tenant:** One application serves multiple customers while separating their data and permissions.
- **Tenant:** A merchant/shop and its associated resources.
- **Storefront:** Public website where customers browse and purchase products.
- **Merchant dashboard:** Private interface for shop management.
- **Theme:** Reusable storefront presentation and layout.
- **Slug:** URL-safe identifier, such as `fashion-house`.
- **Custom domain:** A merchant-owned hostname mapped to a shop.
- **Webhook:** Server-to-server event notification from an external provider.
- **Idempotency:** Handling repeated requests/events without repeating the underlying operation.
- **RPO:** Maximum tolerable data-loss window after an incident.
- **RTO:** Target time to restore service after an incident.
- **MVP:** Minimum viable product that can be tested with real users.

## 27. Conclusion

The platform should begin as a secure, well-structured multi-tenant e-commerce SaaS rather than a collection of individually deployed shop websites. The strongest initial milestone is a merchant workflow that reliably creates a shop, applies a theme, manages products, publishes a storefront, and processes orders.

Recurring billing, automated custom domains, courier integrations, and AI-driven automation can then be added in phases. Security, tenant isolation, payment verification, backups, and clear subscription behavior must remain foundational throughout development.

This document should be maintained as a living specification. Update it as merchant interviews, prototypes, implementation details, and pilot results produce validated decisions.
