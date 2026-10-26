# Browser review and local polish

Reviewed on 2026-10-26 at 1440×1000 and 390×844. The walkthrough covered the homepage, sign-in/registration, two live stores, tracking, all six theme previews, all ten merchant pages and administrator operations. This is a local review, not certification for public hosting.

| Observed gap | Resulting behavior |
|---|---|
| Homepage section links disappeared on mobile | A compact menu exposes Features, Themes, Pricing, Live Demos and registration. Billing has a named switch. |
| Registration and checkout fields lacked associated labels | Labels, autocomplete, input limits and error announcements are connected to their controls. Login includes password visibility. |
| Registration could replace a manually chosen URL or open an older store | Manual URL choices survive name edits; newly created stores become active. Signed-in merchants can create another store. |
| Cart could not be dismissed with Escape | Cart and checkout use shared native dialogs, keyboard focus handling and scroll restoration. Checkout stays open while an order is being submitted. |
| Cart controls could exceed known stock; persisted data was trusted blindly | Quantity controls respect stock and the 100-unit line limit. Invalid stored lines are discarded and duplicates are combined. The server still validates current stock and prices. |
| A saved checkout was hard to recover after emptying the bag | The bag exposes recovery even when empty. Checkout also links back to edit the bag without losing form fields. |
| Merchants could sell options but could not manage them | Products → Options creates and edits names, SKUs, prices, stock and availability. Stock conflicts retain edits and offer Reload options. |
| Option selection/order documents could become confusing after catalog changes | Initial selection uses the lowest-priced available option; price sorting uses that same starting price. Options keep creation order after stock changes. New orders save option titles for order details, tracking and invoices. |
| Private request expiry left dashboard pages stranded | Expired sessions return to sign-in with an explanation. |
| Admin failures resembled empty data, and actions used browser prompts | Explicit loading/error/retry states and labeled action forms retain input on failure. Store moderation uses readable mobile cards. |
| Admin value metrics included undelivered orders and expired plans | Delivered order value counts delivered orders; monthly plan value excludes expired periods and is labeled as an estimate rather than receipts. |

## Managing options

Open **Dashboard → Products → Options** beside a product. Add one option for each size, color or edition. A blank option price inherits the product price; zero is a valid explicit price. Each active option uses its own inventory. Turning every option off returns the product to its base inventory; stock is not transferred automatically. Products support up to 100 options.

Changing option stock requires the quantity originally loaded by the editor. If checkout changed it, saving fails without overwriting inventory. Choose **Reload options**, review the current quantity and retry. Changing only an option's name or price preserves current stock.

New order documents preserve option names, SKUs and prices recorded at checkout. Existing order snapshots remain readable; missing historical option names cannot be reconstructed reliably.

## Evidence and remaining work

Commands, browser traces and screenshots are recorded under `.gravitas/sessions/polish/`; the current results are in [verification](VERIFICATION.md). No dependencies or database columns were added. Browser checks create temporary merchants and remove those accounts, their shops and their associated audit events.

Before public hosting, complete [operations preparation](OPERATIONS.md): TLS/domain routing, private services, monitoring, off-host backups and restore drills. Live payment/courier/mail providers and self-service password recovery remain unimplemented. Catalog, order and admin store lists still load whole collections; add pagination and measure representative tenant sizes before high-volume use. This pass did not run a load test, penetration test or hosted deployment.
