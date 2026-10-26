# Merchant operations upgrade

Researched on 2026-10-25. References are the platforms' public product pages. Their marketing descriptions informed priorities; private competitor dashboards, provider connections and performance claims were not independently tested. Arise Store's implementation is original and uses its existing data and interface conventions.

| Reference | Relevant public pattern | Applied to Arise Store |
|---|---|---|
| [Zatiq Easy](https://zatiqeasy.com/) | Customer management, order management and report exports appear in its feature comparison. | Searchable customer contacts, store-specific order histories and downloadable reports. |
| [Bitcommerz](https://bitcommerz.com/) | Date/product reporting and automatic invoices are presented as merchant tools. | Date-based sales analysis, historical top-product reporting and printable order invoices. |
| [Sellsull](https://sellsull.com/) | Sales reports and analytics sit alongside order and inventory tools. | Reports integrated into the same active-store dashboard, with clear order-status and value breakdowns. |
| [StoreX](https://www.storex.com.bd/) | Order tracking, invoice printing and reporting are part of its operations pitch. | Date/search/status order filters, matching CSV exports and invoices built from saved order records. |

## Available in the local application

### Customers — `/dashboard/customers`

Search customer name, phone or email. Results are paginated in groups of 25. Each profile shows order counts, delivered value, cancellations, returns/refunds and its latest 50 orders, with a link to all matching orders. Contacts come from the first successful checkout; individual orders retain their own recipient and delivery snapshots. History is confined to the selected store and is not a cross-courier fraud score.

### Sales reports — `/dashboard/reports`

Choose a date range or the last 7, 30 or 90 days. Reports support up to 366 days at once. The daily chart, accessible daily figures and CSV export show order placement dates in Asia/Dhaka. Metrics use the current saved order status:

- Delivered value includes saved discounts and delivery fees.
- Product value after discounts and delivery fees are shown separately.
- Cancelled, returned and refunded orders are excluded from delivered values.
- Top products use historical item names and quantities from delivered orders. Their item values are before order-wide discounts and exclude delivery.
- Unique customer counts use order phone numbers. The reports do not invent visitor data or bank settlements.

Historical figures can change when fulfillment status changes. They describe orders placed within the chosen window; they are not grouped by delivery-event dates.

### Orders — `/dashboard/orders`

Combine search, status and inclusive Bangladesh date filters. **Export current view** downloads the same matching order rows as UTF-8 CSV. Text cells that could be interpreted as spreadsheet formulas are neutralized, and quoting preserves commas, newlines and Bangla text. Internal merchant notes are excluded.

Open an order and choose **Open printable invoice**. The authenticated invoice uses saved item names, quantities, prices, delivery, discount, payment state and totals, plus the store's current contact details. **Print invoice** uses the browser print dialog, which also supports saving a PDF. Navigation/actions are hidden in the printed document. Renaming a catalog product does not rewrite the invoice.

## Further integrations

These were researched but are separate work; no placeholder controls claim they are connected:

| Area | Required work |
|---|---|
| Courier booking and delivery synchronization | Merchant/provider credentials, address mapping, retries, webhooks and reconciliation for selected couriers. |
| Online payments | An approved merchant gateway account, sandbox verification, signed callbacks, refunds and reconciliation. |
| Network fraud checking | A permitted provider data source and measured rules; internal cancellation counts alone cannot establish fraud. |
| Abandoned-checkout recovery and marketing pixels | An event/consent design and an actual recovery/notification pipeline. |
| POS, warehouses and bulk catalog imports | Explicit stock-ledger and import rules, with transaction/concurrency tests. |
| Image uploads | File validation, storage and authenticated tenant-scoped media handling. |

Customer endpoints are paginated and report ranges are bounded. Existing catalog/order list endpoints still return whole collections; measure and paginate those before high-volume hosting. No new dependency, database migration or external account was required for this upgrade.
