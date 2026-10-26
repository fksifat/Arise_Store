# Arise Store

A multi-tenant commerce application for Bangladeshi merchants. The local stack runs Next.js 16, React 19, FastAPI, PostgreSQL 17 and Redis. Customer checkout currently supports cash on delivery. Subscription payments require administrator confirmation.

## Run locally with Docker (recommended)

Requirements: Docker with Compose, Python 3, and ports 3000/8000 available. PostgreSQL uses local port 5434 by default; change `POSTGRES_PORT` if needed.

```bash
bash scripts/setup-local.sh --docker
```

Open **http://localhost:3000** and register a merchant. The script creates a private `.env` with random secrets. Compose runs migrations and seeds the 18 themes and subscription plans before starting the API. It does not create demo accounts or products by default. Services bind to localhost; Redis remains private to the Compose network.

For a database client such as DBeaver, pgAdmin or an IDE, connect to **127.0.0.1:5434**, database **arise**, user **arise**, with `POSTGRES_PASSWORD` from `.env`. The Docker API connects internally to `postgres:5432`. Host Python commands use `DATABASE_URL` from `.env`; this workspace now points to the same PostgreSQL database. See [local PostgreSQL instructions](docs/OPERATIONS.md#local-postgresql-connection).

Create a platform administrator explicitly:

```bash
docker compose exec api python -m app.manage create-admin
```

The command prompts for an email and a password of at least 12 characters. Log in through `/login`; administrators use `/admin`. Merchant registration creates a draft shop with a 14-day trial. Add products and publish it from the dashboard. Storefronts are available at `/store/your-slug`.

```bash
docker compose ps
docker compose logs --tail=100 api web
docker compose stop             # preserves all data
```

Demo accounts are opt-in for local development. To enable both sample stores and the login quick-fill buttons, set these values in `.env` and recreate the API and web services:

```dotenv
APP_ENV=development
SEED_DEMO_DATA=true
```

```bash
docker compose up -d --force-recreate api web
```

| Account | Email | Password |
|---|---|---|
| Demo Merchant | `merchant@arisestore.com` | `merchantpassword123` |
| Platform Admin | `admin@arisestore.com` | `adminpassword123` |

Demo setup creates missing accounts and sample stores; it does not reset passwords on existing accounts. A one-time `docker compose exec api python -m app.manage seed --demo` creates sample data, but quick-fill buttons appear only when demo mode is enabled. Production rejects demo seeding and hides the buttons.

Before hosting, use a separate database or deactivate/remove the demo accounts and sample stores, and rotate the signing key. Switching demo mode off does not delete existing accounts.

## Run without Docker

Requires Python 3.12+, Node.js 22+ and npm. Host processes read `DATABASE_URL` from `.env`. The template defaults to SQLite at `.data/arise.db`; this workspace is configured to use the Docker PostgreSQL database instead. Keep PostgreSQL running and stop the Docker API/web before starting host processes on their ports. Development rate limits are process-local unless `REDIS_URL` is configured.

```bash
bash scripts/setup-local.sh
bash scripts/run-local.sh
```

Create an administrator from the repository root:

```bash
PYTHONPATH=services/api venv/bin/python -m app.manage create-admin
```

The existing `arise_store.db` and `test_shared.db` are not used or automatically migrated by the new local setup. To adopt existing data, follow [operations instructions](docs/OPERATIONS.md) on a backup first.

## What is implemented

- Merchant registration, cookie-based browser sessions, JWT authentication for API clients, owner/staff authorization and tenant isolation.
- Product creation/editing with safe stock adjustments, option management and purchases, category management, 18 storefront themes with product quick views, search/category/price controls, clear image placeholders, per-store carts and configurable delivery fees.
- Server-authoritative checkout totals, conditional stock updates, persistent checkout retry keys, immutable order snapshots and validated fulfillment transitions.
- Full-phone verification for order tracking; public responses exclude internal merchant notes.
- Subscription expiry enforcement and manual payment requests, approval/rejection and audit history.
- Domain ownership verification through unique DNS TXT records. DNS verification does **not** activate routing or certify HTTPS.
- Production configuration guards, explicit CORS/hosts, request-size limits, shared Redis abuse limits, security headers and database readiness checks.
- Versioned Alembic migrations, non-root containers and automated verification.

Online customer payment gateways, automatic subscription charging, email/SMS delivery, courier integrations and custom-domain hosting are not enabled. The larger [product specification](ecommerce_saas_platform_documentation.md) is a roadmap, not an implementation checklist marked complete.

## Merchant dashboard

The dashboard at `/dashboard` has a shared active-store selector and mobile navigation. Its overview separates delivered order value from unfulfilled orders, counts active products, flags low-stock products/options and links to the filtered work queues. Storefront links use the actual `/store/<slug>` address and appear when published.

Orders include customer/delivery/item details and permitted fulfillment transitions. Products support draft/active visibility, safe stock edits and low-stock filtering. Categories can be created, renamed and archived. Settings support store branding, clearing optional fields and decimal delivery fees. Themes, domain verification and manual billing retain their existing server rules; billing history and domain feedback make pending steps visible. Failed page requests have retry controls.

**Products → Options** manages option names, SKUs, inherited/custom prices, stock and shopper availability. Conflicting stock edits retain your input and offer a reload. New order details, tracking and invoices retain the option name recorded at purchase. [Browser review and option instructions](docs/BROWSER_REVIEW.md).

Merchant **Settings → Storefront banner & offers** controls the banner image/copy, announcement and optional store-wide percentage discount. Discounts apply automatically to product totals at checkout, exclude delivery, and are saved on orders. [Banner and offer instructions](docs/OFFERS.md).

## Customer insights, reports and invoices

- `/dashboard/customers`: searchable, paginated contacts with store-specific delivery/order histories.
- `/dashboard/reports`: Bangladesh date filters, daily delivered-value chart, status/value breakdowns, historical top products and CSV report export.
- `/dashboard/orders`: search/status/date filters with a matching CSV export. Open an order to view its printable invoice or save a PDF through the browser print dialog.

Exports protect spreadsheet formula-like text and preserve Bangla/quoted fields. Invoices use saved product names and totals; internal notes are excluded. [Research, feature details and integration roadmap](docs/COMPETITOR_REVIEW.md).

## Storefront themes

The theme gallery at `/dashboard/themes` has 18 designs: three each for Fashion, Electronics, Grocery & essentials, Home & furniture, Beauty & skincare, and Sport & outdoor. Enter a category to compare its designs, preview them and apply one. The homepage also browses by category, and each preview links to its related designs. Each theme has a responsive layout, working category navigation, search, sorting, option pricing and product quick views. Preview a design at `/themes/<theme-key>` using clearly labeled sample products; preview checkout cannot place orders.

Apply a theme from the dashboard or choose one when registering. Changing themes preserves custom brand colors and hero copy while refreshing unmodified defaults. Existing products, inventory, orders and draft/published status are preserved. [Design references and asset credits](docs/THEME_DESIGN.md).

## Verification

```bash
PYTHONPATH=services/api venv/bin/pytest services/api/tests -q
bash scripts/test-postgres.sh   # isolated arise_test database; requires the local Docker stack
cd apps/web
npm run build
npm audit
```

Browser tests exercise registration, safe product editing, theme application/custom branding, category/related-preview browsing, desktop/mobile browsing and checkout across all 18 themes, order tracking, and recovery after a successful checkout response is lost, including a sold-out variant:

```bash
cd apps/web
npx playwright install chromium
cd ../..
bash scripts/test-browser.sh
```

The browser script removes only the merchant accounts created by that run. Do not point it at a hosted production system. CI checks PostgreSQL behavior, migrations, the frontend build and dependency advisories.

## Code map

| Location | Responsibility |
|---|---|
| `apps/web/src/app` | Marketing, authentication, dashboard, storefront and admin routes |
| `apps/web/src/components` | Themes, variant purchase controls, cart and checkout |
| `apps/web/src/lib` | API client, authentication and cart contexts |
| `services/api/app/routers` | API endpoints under `/api/v1` |
| `services/api/app/core` | Security, tenant permissions, subscriptions and request controls |
| `services/api/app/models` | SQLAlchemy entities and database constraints |
| `services/api/app/schemas` | Request/response validation |
| `services/api/migrations` | Versioned schema changes |
| `services/api/tests`, `apps/web/e2e` | Regression, concurrency and browser checks |
| `infrastructure/docker`, `scripts` | Containers, setup, verification and backup commands |

API documentation is at http://localhost:8000/docs in development. `/health` reports process health; `/ready` checks the database schema and Redis connection.

See [operations](docs/OPERATIONS.md) for backups, existing-data adoption and hosting preparation, and [verification results](docs/VERIFICATION.md) for the checks actually run.
