# Verification record

Latest theme-category release checked on 2026-10-26 (Asia/Dhaka). This describes observed local results, not a guarantee of hosted reliability. Earlier full-app scans, SQLite checks, dependency audits, migration adoption, Redis integration and backup/restore exercises are retained evidence from prior passes; they were not repeated for the theme-only changes.

| Check | Observed result |
|---|---|
| Original backend baseline | 5 passed |
| Final PostgreSQL regression suite | 90 passed, 0 failed; one upstream TestClient deprecation warning |
| Concurrency | Competing checkouts cannot oversell; simultaneous identical checkout keys return the same order |
| Browser tests | 23 passed with local demo tests enabled: category and related-preview browsing, applying/checking out in all 18 themes, promotions, registration, both demo logins, options/stock conflicts, checkout/recovery/tracking, dashboard, reports/invoices, session expiry and administrator failure recovery. Generic runs skip the two opt-in demo tests. |
| Current theme visual probe | 36 desktop/mobile theme visits; no broken images, page overflow or JavaScript/hydration errors; matching variant accents and related-preview links |
| Earlier polish SQLite checks | All 15 new backend checks passed |
| Earlier full-app page scan | 46 desktop/mobile page visits plus cart Escape check; no page JavaScript errors, page overflow, unlabeled visible controls or broken section anchors |
| Earlier development dialog check | Dialog survives Next development StrictMode effects; Escape restores page scrolling |
| Frontend production build | Next.js 16.4.1 compiled; TypeScript and static generation passed |
| npm audit | 0 known vulnerabilities, including development dependencies |
| pip-audit on runtime requirements | No known vulnerabilities found |
| Fresh SQLite migrations | Upgrade to head and Alembic schema check passed |
| PostgreSQL migrations | Compose migration job succeeded; running schema check reported no new operations |
| Legacy database adoption | Migrated a temporary copy of the original SQLite database; table counts and checked order snapshots preserved |
| Real Redis integration | Session revocation and abuse-limit boundary passed |
| Backup/restore | PostgreSQL dump restored into a separate database; core table counts matched |
| Container runtime | API, web, PostgreSQL and Redis reported healthy; migrations exited successfully |
| Setup/configuration | Shell syntax and Compose configuration checks passed; generated `.env` permissions are 0600 |

The Gravitas verification runner recorded `VERDICT: PASS` for the current backend, full browser suite, production build, type, visual and runtime checks under `.gravitas/sessions/theme-segments/`. Its build generated all 18 preview routes successfully. Earlier polish, helper and dependency results are under `.gravitas/sessions/polish/`; original release logs are under `.gravitas/sessions/production/`.

The security reviewer identified defects in variants, tenant category references, order transitions, public notes, payment verification, PostgreSQL migration types, checkout recovery and token revocation timing. Regression coverage and the final browser run include the repaired behavior.

Dependency changes follow the [official Next.js security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026) and [supported-version policy](https://nextjs.org/support-policy). The build also includes a tested override for `postcss-selector-parser` 7.1.6 to patch the advisory affecting the installed Tailwind 3 toolchain.

## Local usability improvements

A browser walkthrough reproduced missing product edit controls, nonfunctional SKU search, inert category navigation and missing tracking links. These now work. Product edits preserve variants, unchanged categories, additional images and draft status; unchanged stock is omitted, and explicit stock edits reject stale expected quantities. Decimal price entry was verified with ৳0.29. Empty filters can be cleared, missing/broken images show placeholders, and tracking links prefill only the order number.

The final browser checks covered 1440×1000 and 390×844 viewports without page JavaScript errors or horizontal overflow in the tested flows. Temporary inspection/browser accounts were removed. No dependencies were added.

## Local demo login

Both quick-fill accounts were missing from the running database despite being offered on the login page. Local demo mode is now explicitly enabled in this workspace and both accounts were provisioned. Two dedicated browser tests confirmed merchant/admin redirects and HttpOnly sessions. Separate runtime probes confirmed quick-fill controls are hidden when disabled and in production even if the demo flag is true. Demo seeding is blocked at the shared seed function in production and preserves existing passwords on repeat runs. Test processes explicitly disable demo startup to keep local demo settings out of test databases.

Demo-specific tests are opt-in:

```bash
E2E_DEMO_LOGIN=true npm --prefix apps/web run test:e2e -- e2e/demo-login.spec.ts
```

Results are recorded in `.gravitas/sessions/demo-login/`. These two tests use the explicitly enabled demo accounts and do not create/delete them. The generic browser suite continues to use isolated temporary merchant accounts.

## Six-theme library

Three existing themes were redesigned and Home & Living, Beauty Studio and Sport Performance were added. The shared manifest drives API defaults, previews and gallery metadata. The production Docker build passed compilation, TypeScript and static generation of all six preview routes. The running local web container serves the new layouts and locally stored images.

Browser tests applied every theme through the gallery, preserved a merchant-authored subtitle and white brand color, refreshed default hero copy/images, and confirmed that a draft shop stayed unpublished with unchanged stock. A subsequent real mobile checkout in each theme produced six orders with the selected variant's correct price. Preview checkout displayed its sample-data notice without placing orders. Existing browser flows exercised search by name/SKU, category selection, empty-state recovery, sorting, broken-image fallback and tracking links across all six themes at desktop/mobile sizes.

An additional visual probe captured all six preview layouts at 1440×1000 and 390×844, eagerly loaded the local photos, and reported HTTP 200, zero broken images, no horizontal overflow and no page JavaScript errors. The gallery displayed six matching screenshots. Layout screenshots were inspected locally; reference links and photography sources are in [theme design notes](THEME_DESIGN.md). No dependencies were added. A Docker disk-space failure was resolved by removing disposable build cache; the subsequent build and verification runs passed.

The two opt-in demo login tests were also rerun separately against the rebuilt web app and passed for merchant and administrator. Their latest output is in `.gravitas/sessions/themes/demo-login.log`.

## Merchant dashboard pass

All eight merchant pages now share active-store state and a compact mobile menu. The original mobile layout put the main content at y=599; the updated layout starts at y=64. Real store URLs replace unhosted domain labels, publication changes and settings saves update the shared sidebar, and unavailable data no longer appears as an empty catalog/order list. The overview counts active products, separates delivered order value from orders awaiting fulfillment, and accounts for low-stock active variants without including untracked/draft products.

The dashboard browser tests verify exact metric definitions, loading failures and retry behavior, keyboard menu dismissal, stock filtering, store creation, category editing/clearing, product visibility changes, settings clearing and ৳0.29 delivery fees, publication, customer/order-item details, every forward fulfillment step through delivery, manual billing pending state and switching between two real temporary stores. Controlled responses exercise settings failure without lost edits and DNS verification failure/success while keeping hosting pending. DNS-provider propagation is outside this UI test.

A local walkthrough visited all eight pages at 1440×1000 and 390×844, captured screenshots and found no horizontal page overflow or page JavaScript errors. Existing storefront, catalog-concurrency, checkout-recovery and theme-switching browser flows remain in the regression suite. Logs and screenshots are under `.gravitas/sessions/dashboard/`. No dependencies or backend API rules changed. The PostgreSQL backend suite was not rerun for this frontend pass.

## Banner and offer controls

Merchant Settings now edits the banner image URL, small heading, headline, description, button text, image description and optional offer message/percentage discount. The typed content endpoint saves the shop banner and theme content in one transaction, preserves unrelated brand settings, and retains the existing owner-only permissions. No database migration or dependency was added.

The PostgreSQL suite now has 64 passing tests. New coverage checks banner URL validation, strict percentage limits, unchanged data after invalid saves, tenant/owner/manager/staff boundaries, discounts on current sale/variant prices, delivery exclusion, half-up poisha rounding, 0%/100% cases, customer-supplied discount rejection, changed-quote rollback, saved order totals, tracking and idempotent replay after an offer is disabled. Client discount calculations were also checked against exact integer arithmetic, including large safe totals.

The full browser suite has 14 passing tests and two optional demo-login tests skipped. A real temporary merchant saved and reloaded banner/offer settings, applied every theme without losing the promotion, viewed all six at desktop/mobile sizes, placed a discounted variant order, verified its stored totals and tracked its saved discount. Disabling the offer restored undiscounted quotes. Additional checks put maximum-length unbroken custom text in every mobile theme without horizontal overflow. The first browser check found an ambiguous nested textarea label; an explicit label association fixed it before the final passing run.

Production compilation, TypeScript and static generation passed. Logs, exact pricing checks and screenshots are in `.gravitas/sessions/promotions/`. Banner images use hosted URLs. Image uploads, coupon codes and scheduled campaigns were not implemented; see [offer instructions](OFFERS.md).

## Merchant operations upgrade

The comparison of Zatiq, Bitcommerz, Sellsull and StoreX informed a customer directory, sales reports, order exports and printable invoices. Primary reference links and implemented/deferred features are recorded in [the comparison notes](COMPETITOR_REVIEW.md). The implementation uses existing customer records and immutable order snapshots without new dependencies or migrations.

The final PostgreSQL suite has 74 passing tests; the ten affected operations tests also passed on SQLite. Coverage includes Asia/Dhaka midnight boundaries, inclusive end dates, zero-filled daily series, bounded report periods, current-status filtering, discount/delivery accounting, historical item names, customer search/pagination, bounded history, foreign-customer rejection and authenticated tenant boundaries.

All 16 generic browser tests passed; the two optional demo-login tests were skipped. New flows use a temporary real merchant with repeat customers and delivered/pending/cancelled orders. They verify customer summaries, report metrics, Unicode and formula-safe CSV exports matching filters, product-rename-safe invoice contents, exclusion of internal notes, print CSS/browser print invocation, PDF generation, pagination and recoverable request failures. Customers, Reports and invoice layouts were checked at 390×844 without horizontal page overflow. Reports were also captured on desktop. Export/date helpers were checked against known CSV and UTC-to-Dhaka boundary cases.

The production build and TypeScript checks passed on the running local containers. Logs, screenshots and a sample PDF are under `.gravitas/sessions/commerce-upgrade/`. No competitor private dashboards or live provider integrations were tested. Existing whole-collection order/catalog listing remains a hosting scale limit even though customer listing is paginated and report windows are bounded.

## Browser polish and option management

The [browser review](BROWSER_REVIEW.md) records the observed gaps and resulting behavior. Native dialogs now handle Escape, focus boundaries and page scrolling; cart persistence validates stored entries and limits quantities. A saved checkout can be recovered from an empty bag, and returning from checkout to edit the bag preserves customer fields. Mobile homepage navigation, form labels, password visibility, manual registration slugs, new-store selection and session expiry feedback were checked in the browser.

Options can be created and edited with their own SKU, inherited/custom price, availability and stock. API checks cover tenant/staff rejection, wrong-product IDs, archived products, option limits, null/negative values, stale-stock rejection, metadata edits preserving stock and stable ordering after updates. Historical option names, attributes, SKUs and prices survive catalog edits; legacy snapshots remain unchanged. Administrator metrics exclude undelivered order value and expired active plans. Its browser checks exercise unavailable data, retry, filters, failed payment confirmation with retained input, successful confirmation and mobile moderation dialogs using controlled responses.

The real merchant browser flow verifies ৳0.29 option entry, stock conflict/reload, bounded cart quantities, keyboard focus, bag editing, a lost successful checkout response, recovery after emptying the bag, one saved order and an invoice retaining the original option name/price after a rename. The full 22-test run removed eight generated accounts and their associated audit events. No dependencies or database columns were added.

Final commands included `bash scripts/test-postgres.sh`, the affected SQLite tests, `E2E_DEMO_LOGIN=true bash scripts/test-browser.sh`, `npm --prefix apps/web run typecheck`, dependency audits, the page probe and runtime/schema checks through the Gravitas runner. The app was rebuilt with `docker compose up -d --build --wait web` and left running locally.

## Theme categories and design variants

The library now includes three designs in each of six store categories, for 18 themes total. Dashboard categories show counts and group related designs; the homepage filters by category and each preview links to its sibling designs. Existing theme keys remain compatible. A shared family connects appropriate sample products and base styles; the additional compositions are scoped to their own theme keys.

The catalog/API checks require three distinct entries per category and verify that seeding and applying every theme preserve merchant settings, stock and draft status. Browser coverage checks category filtering on the homepage and dashboard, entering a category, related-preview navigation, separate persisted preview bags, registration with the selected design, product quick views, theme application with custom branding, promotions and checkout through all 18 designs.

Local thumbnails are screenshots of the actual storefronts. The visual probe visits all 18 at 1440×1200 and 390×844, checks image loading, page overflow, related-design links, dialog dismissal and page JavaScript/hydration errors. It also checks new variant button accents and prevents a trailing headline period from wrapping onto its own line. The images and original layouts were inspected locally. Logs and screenshots are under `.gravitas/sessions/theme-segments/`.

Final results: 90 PostgreSQL tests, 23 full browser tests (including both local demo logins), six targeted gallery/theme tests, TypeScript and the Docker production build passed. A real temporary merchant applied every design without publishing its draft or losing custom branding, then completed 18 separate COD orders with the selected option price. Additional tests exercised promotion preservation in every design, maximum-length banner content and product browsing/sorting. The full run removed its eight temporary accounts and associated audit events. A read-only demo-account walkthrough also confirmed the final category galleries. Web, API, PostgreSQL and Redis were left healthy locally.

No dependencies, schema fields or new payment behavior were added. The existing hosting and integration limits below still apply.

## Repeat the checks

With the local Compose stack running and host dependencies installed:

```bash
bash scripts/verify-local.sh
bash scripts/test-browser.sh
```

Browser tests require Playwright's Chromium installation. See the README. PostgreSQL regressions use a dedicated `arise_test` database. Browser checks remove only accounts generated by that run. Backups and isolated restore-check databases are retained for inspection.

## Limits

GitHub Actions workflows were written but not executed on GitHub in this session. No hosted TLS/domain provisioning, live DNS ownership record, payment gateway, mail provider, courier service, load test or penetration test was verified. DNS tests exercise matching, mismatching and plan eligibility with controlled resolver responses. The standalone development path was checked through its components and SQLite migration/test runs; the full application and browser flows were exercised using Docker/PostgreSQL.

Local setup is suitable for evaluating the hardened COD/manual-billing release. Before accepting public production traffic, complete the hosting work and operational procedures in `OPERATIONS.md`. Email verification/password recovery, automatic charging, notifications and courier automation remain separate product work. Catalog/order listing endpoints still return whole collections; add pagination and measure realistic tenant sizes before high-volume hosting.
