# Arise website builder

Arise supports business websites, portfolios, blogs, landing pages, online stores, agency websites and a flexible Other type. Commerce is one website type, with its own products, inventory and order workflows.

## Build a website locally

1. Open `http://localhost:3000/register` and create an account with name, email, password and confirmation. Sign in with email/password if already registered. Then `/setup` guides you through website type, name/URL, theme and review. Business website is the default. Setup autosaves to the signed-in account; signing out or returning in another browser resumes the saved step. Website creation starts the 14-day trial. Each account can create one owned website; additional-store creation and store-limit upgrades are locked. Store Portfolio shows existing accessible stores.
2. Choose a design in **Themes**. There are three themes for each of the six non-store types, plus the existing 18 store themes. Non-store themes support a custom brand color.
3. Open **Pages**, select Home, and customize its sections. Add, reorder, hide or remove sections and edit their text, images, links and items. Available sections include hero, text, services/features, image/project gallery, FAQ, testimonials, contact details, call to action and recent blog posts.
4. Choose **Save draft**. The inline preview shows local edits; **Preview saved draft** opens an authenticated, non-indexable preview of the saved content. Neither updates the public page.
5. Choose **Publish page**, then publish the website from **Overview**. Only published content is served publicly.
6. Add supporting pages or write articles under **Blog**. Published pages appear in navigation, and published articles appear in the blog feed. Contact sections use the public email, phone and address entered in **Settings**.

Content editing uses structured sections rather than a free-form canvas. Images use URLs; no upload service was added. Text is rendered as plain text with line breaks, including in blog articles. User HTML and JavaScript are not executed. Testimonials are written by the owner; the templates do not invent reviews or customers.

## Publishing behavior

- Saving a draft preserves the last published page, title, description and URL. Publish explicitly to update them.
- Hidden sections stay in the saved editor content but are removed from public API responses and rendered pages.
- Publishing a page does not publish a draft website. A non-store website requires a published homepage before its visibility can be enabled.
- Unpublish the website before unpublishing its homepage. Other pages/posts can be unpublished independently; their drafts remain available.
- Published content must be unpublished before deletion. The homepage cannot be deleted or renamed.
- Publishing, unpublishing, deletion and saves check the revision originally loaded by the editor. Conflicts retain local edits and offer an explicit reload/discard action.
- Theme, brand-color and general contact-setting changes affect published pages immediately. They are shared website settings, separate from page drafts.
- Private drafts and saved previews require an authorized owner or team member. Staff can read content; managers can edit drafts. The existing owner-only policy controls publishing, domains, billing and theme changes.

## URLs

| Content | Local path |
|---|---|
| General website homepage | `/site/<website-slug>` |
| Supporting page | `/site/<website-slug>/<page-slug>` |
| Blog index | `/site/<website-slug>/blog` |
| Published article | `/site/<website-slug>/blog/<post-slug>` |
| Online store | `/store/<website-slug>` |
| Authenticated saved preview | `/preview/<website-slug>/<page-id>` |

Published non-store pages render on the server and include their saved title and search description. Blog lists are paginated. Store homepages retain the existing storefront themes, banner/offer settings and COD checkout. Stores can also add supporting pages and blog posts; their published page links appear in storefront navigation/footer. `/site/<store-slug>` redirects to its store homepage.

## Architecture and compatibility

The `shops` table and `/api/v1/shops` endpoints remain the tenant boundary for compatibility. Migration `0005` adds the per-account `setup_drafts` table; completing setup clears its draft in the same transaction as website creation. A failed creation preserves progress. Apply migrations before starting the updated API. Migration `0004` adds `website_type` to existing tenants and themes and creates `site_pages`. Existing tenants/themes default to `online_store`; no product or order tables are renamed or replaced. Each page/post has editable content, a published snapshot and a revision counter.

`website_catalog.json` shares website types, theme presets and starter sections between the API and frontend. The existing storefront catalog stays intact. The shared `Website` renderer powers published pages, saved previews, editor previews and non-store theme demos. A website's type is chosen at creation and is not changed in place. The current one-store account limit applies across all website types.

All website types share existing account authentication, tenant isolation, subscriptions, moderation, DNS ownership verification and manual billing. Public access requires a published website with an active/trial subscription. Non-store websites do not expose store-only API tools or checkout. Private dashboard access remains available for renewal and draft work, subject to role/moderation rules.

## Current limits

- Up to 500 combined pages/posts per tenant, 30 sections per document and 12 items per section. The existing 1 MiB request limit still applies.
- Published snapshots preserve the current live version; this is not a full revision-history or undo service.
- Media uploads, form submissions, newsletter delivery, comments, rich-text formatting, arbitrary scripts, plugins and a free-form drag-and-drop canvas are not included.
- Custom-domain verification does not provision DNS routing or TLS. Hosting, monitoring, off-host backups and load testing remain separate launch work.
- Existing commerce pagination and live payment/courier integration limits remain documented in [operations](OPERATIONS.md).

The larger original commerce specification is retained as historical/product-module documentation. This guide describes the implemented website-building foundation.
