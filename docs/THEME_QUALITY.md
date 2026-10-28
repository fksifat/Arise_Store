# Theme accounts and quality review

Reviewed locally on 28 October 2026 (Asia/Dhaka). Each of the 36 themes has a separate owner account and a published sample website.

Login details are in the ignored, private [local login directory](../.data/theme-review/logins.md). The test runner uses a private [account manifest](../.data/theme-review/accounts.json). Passwords are not included in this report or committed source.

## Changes

- Refreshed the 18 website themes with purposeful starter copy, local photography, distinct framing, stronger typography, section navigation and responsive layouts. Existing merchants keep their saved content.
- Added validated section layout, spacing, background tone and anchor controls, plus ordering for gallery, feature, FAQ and testimonial items.
- Added color swatches, editable hex colors and heading typography controls to all 36 themes. Theme changes keep custom brand choices.
- Made store story headings, footer taglines and banner button destinations editable. Same-site banner image paths work; unsafe URLs are rejected.
- Corrected multiline headline editing, low-contrast body copy, product heading hierarchy and mobile store-menu Escape handling. Broken website images now use the existing image placeholder.
- Removed nonfunctional FAQ/testimonial image/link item controls and nested main landmarks from editor previews.
- Updated success feedback so switching themes clears old brand-save notices.
- Fixed Daily Market’s mobile hero to stack into one column, and made brand-color section headings inherit the correct contrasting text color.

## Verification

- **36/36 retained-account walkthroughs passed:** real login, separate ownership, editing, save/reload, publication boundaries, brand color and typography. Each theme was rendered at 1440 px and 390 px, producing 72 full-page screenshots.
- **API:** 131 passed, 1 PostgreSQL-only test skipped in the default run; **132 passed** against PostgreSQL.
- **Browser regression:** 26 passed, 3 expected opt-in skips. This includes all theme demos, mobile browsing, checkout, theme switching, recovery after request failures, and website publishing.
- **Release checks:** production build and TypeScript passed. After the final CSS fixes, **19/19 targeted walkthroughs passed**: all 18 website themes plus Daily Market, covering contrasting headings, section cards and the corrected mobile hero.
- Desktop and mobile checks found no horizontal overflow or broken sample images. Sampled introductory body copy meets a 4.5:1 contrast ratio. Manual visual review also caught and fixed the narrow Daily Market mobile hero.

[Website desktop overview](../.gravitas/sessions/theme-quality/websites-1440-overview.jpg) · [Website mobile overview](../.gravitas/sessions/theme-quality/websites-390-overview.jpg)  
[Store desktop overview](../.gravitas/sessions/theme-quality/stores-1440-overview.jpg) · [Store mobile overview](../.gravitas/sessions/theme-quality/stores-390-overview.jpg)  
[Editor controls](../.gravitas/sessions/theme-quality/editor-controls.png)

[Full theme walkthrough log](../.gravitas/sessions/theme-quality/theme-review-final.log) · [Release walkthrough log](../.gravitas/sessions/theme-quality/release-smoke-final.log) · [Browser regression log](../.gravitas/sessions/theme-quality/browser-regression-final.log) · [PostgreSQL test log](../.gravitas/sessions/theme-quality/postgres-tests-final.log)

The retained-account suite is opt-in and uses the ignored local manifest; ordinary browser regression runs skip it. The two demo quick-login cases require explicit demo credentials and are also skipped by default.

## Local account directory

| Theme | Website type | Published sample | Account email | Desktop | Mobile |
|---|---|---|---|---|---|
| Business Studio | business | [Open](http://localhost:3000/site/tq-business-studio-6c97dcf5) | `theme-review-business-studio-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/business-studio-1440.png) | [Image](../.gravitas/sessions/theme-quality/business-studio-390.png) |
| Business Classic | business | [Open](http://localhost:3000/site/tq-business-classic-6c97dcf5) | `theme-review-business-classic-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/business-classic-1440.png) | [Image](../.gravitas/sessions/theme-quality/business-classic-390.png) |
| Business Bold | business | [Open](http://localhost:3000/site/tq-business-bold-6c97dcf5) | `theme-review-business-bold-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/business-bold-1440.png) | [Image](../.gravitas/sessions/theme-quality/business-bold-390.png) |
| Portfolio Canvas | portfolio | [Open](http://localhost:3000/site/tq-portfolio-canvas-6c97dcf5) | `theme-review-portfolio-canvas-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/portfolio-canvas-1440.png) | [Image](../.gravitas/sessions/theme-quality/portfolio-canvas-390.png) |
| Portfolio Minimal | portfolio | [Open](http://localhost:3000/site/tq-portfolio-minimal-6c97dcf5) | `theme-review-portfolio-minimal-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/portfolio-minimal-1440.png) | [Image](../.gravitas/sessions/theme-quality/portfolio-minimal-390.png) |
| Portfolio Noir | portfolio | [Open](http://localhost:3000/site/tq-portfolio-noir-6c97dcf5) | `theme-review-portfolio-noir-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/portfolio-noir-1440.png) | [Image](../.gravitas/sessions/theme-quality/portfolio-noir-390.png) |
| The Journal | blog | [Open](http://localhost:3000/site/tq-blog-journal-6c97dcf5) | `theme-review-blog-journal-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/blog-journal-1440.png) | [Image](../.gravitas/sessions/theme-quality/blog-journal-390.png) |
| Notebook | blog | [Open](http://localhost:3000/site/tq-blog-notebook-6c97dcf5) | `theme-review-blog-notebook-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/blog-notebook-1440.png) | [Image](../.gravitas/sessions/theme-quality/blog-notebook-390.png) |
| Dispatch | blog | [Open](http://localhost:3000/site/tq-blog-dispatch-6c97dcf5) | `theme-review-blog-dispatch-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/blog-dispatch-1440.png) | [Image](../.gravitas/sessions/theme-quality/blog-dispatch-390.png) |
| Launch | landing_page | [Open](http://localhost:3000/site/tq-landing-launch-6c97dcf5) | `theme-review-landing-launch-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/landing-launch-1440.png) | [Image](../.gravitas/sessions/theme-quality/landing-launch-390.png) |
| Focus | landing_page | [Open](http://localhost:3000/site/tq-landing-focus-6c97dcf5) | `theme-review-landing-focus-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/landing-focus-1440.png) | [Image](../.gravitas/sessions/theme-quality/landing-focus-390.png) |
| Spotlight | landing_page | [Open](http://localhost:3000/site/tq-landing-spotlight-6c97dcf5) | `theme-review-landing-spotlight-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/landing-spotlight-1440.png) | [Image](../.gravitas/sessions/theme-quality/landing-spotlight-390.png) |
| The Collective | agency | [Open](http://localhost:3000/site/tq-agency-collective-6c97dcf5) | `theme-review-agency-collective-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/agency-collective-1440.png) | [Image](../.gravitas/sessions/theme-quality/agency-collective-390.png) |
| Agency Atelier | agency | [Open](http://localhost:3000/site/tq-agency-atelier-6c97dcf5) | `theme-review-agency-atelier-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/agency-atelier-1440.png) | [Image](../.gravitas/sessions/theme-quality/agency-atelier-390.png) |
| Selected Works | agency | [Open](http://localhost:3000/site/tq-agency-works-6c97dcf5) | `theme-review-agency-works-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/agency-works-1440.png) | [Image](../.gravitas/sessions/theme-quality/agency-works-390.png) |
| Blank Canvas | other | [Open](http://localhost:3000/site/tq-other-canvas-6c97dcf5) | `theme-review-other-canvas-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/other-canvas-1440.png) | [Image](../.gravitas/sessions/theme-quality/other-canvas-390.png) |
| Simple Pages | other | [Open](http://localhost:3000/site/tq-other-simple-6c97dcf5) | `theme-review-other-simple-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/other-simple-1440.png) | [Image](../.gravitas/sessions/theme-quality/other-simple-390.png) |
| Statement | other | [Open](http://localhost:3000/site/tq-other-statement-6c97dcf5) | `theme-review-other-statement-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/other-statement-1440.png) | [Image](../.gravitas/sessions/theme-quality/other-statement-390.png) |
| Fashion Editorial | online_store | [Open](http://localhost:3000/store/tq-fashion-modern-6c97dcf5) | `theme-review-fashion-modern-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/fashion-modern-1440.png) | [Image](../.gravitas/sessions/theme-quality/fashion-modern-390.png) |
| Fashion Noir | online_store | [Open](http://localhost:3000/store/tq-fashion-noir-6c97dcf5) | `theme-review-fashion-noir-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/fashion-noir-1440.png) | [Image](../.gravitas/sessions/theme-quality/fashion-noir-390.png) |
| Fashion Runway | online_store | [Open](http://localhost:3000/store/tq-fashion-runway-6c97dcf5) | `theme-review-fashion-runway-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/fashion-runway-1440.png) | [Image](../.gravitas/sessions/theme-quality/fashion-runway-390.png) |
| Tech Minimal | online_store | [Open](http://localhost:3000/store/tq-tech-cosmetics-6c97dcf5) | `theme-review-tech-cosmetics-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/tech-cosmetics-1440.png) | [Image](../.gravitas/sessions/theme-quality/tech-cosmetics-390.png) |
| Tech Circuit | online_store | [Open](http://localhost:3000/store/tq-tech-circuit-6c97dcf5) | `theme-review-tech-circuit-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/tech-circuit-1440.png) | [Image](../.gravitas/sessions/theme-quality/tech-circuit-390.png) |
| Tech Studio | online_store | [Open](http://localhost:3000/store/tq-tech-studio-6c97dcf5) | `theme-review-tech-studio-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/tech-studio-1440.png) | [Image](../.gravitas/sessions/theme-quality/tech-studio-390.png) |
| Daily Market | online_store | [Open](http://localhost:3000/store/tq-general-store-6c97dcf5) | `theme-review-general-store-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/general-store-1440.png) | [Image](../.gravitas/sessions/theme-quality/general-store-390.png) |
| Fresh Pantry | online_store | [Open](http://localhost:3000/store/tq-market-fresh-6c97dcf5) | `theme-review-market-fresh-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/market-fresh-1440.png) | [Image](../.gravitas/sessions/theme-quality/market-fresh-390.png) |
| Market Express | online_store | [Open](http://localhost:3000/store/tq-market-express-6c97dcf5) | `theme-review-market-express-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/market-express-1440.png) | [Image](../.gravitas/sessions/theme-quality/market-express-390.png) |
| Home & Living | online_store | [Open](http://localhost:3000/store/tq-home-living-6c97dcf5) | `theme-review-home-living-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/home-living-1440.png) | [Image](../.gravitas/sessions/theme-quality/home-living-390.png) |
| Home Gallery | online_store | [Open](http://localhost:3000/store/tq-home-gallery-6c97dcf5) | `theme-review-home-gallery-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/home-gallery-1440.png) | [Image](../.gravitas/sessions/theme-quality/home-gallery-390.png) |
| Scandi Living | online_store | [Open](http://localhost:3000/store/tq-home-scandi-6c97dcf5) | `theme-review-home-scandi-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/home-scandi-1440.png) | [Image](../.gravitas/sessions/theme-quality/home-scandi-390.png) |
| Beauty Studio | online_store | [Open](http://localhost:3000/store/tq-beauty-studio-6c97dcf5) | `theme-review-beauty-studio-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/beauty-studio-1440.png) | [Image](../.gravitas/sessions/theme-quality/beauty-studio-390.png) |
| Botanical Ritual | online_store | [Open](http://localhost:3000/store/tq-beauty-botanica-6c97dcf5) | `theme-review-beauty-botanica-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/beauty-botanica-1440.png) | [Image](../.gravitas/sessions/theme-quality/beauty-botanica-390.png) |
| Beauty Atelier | online_store | [Open](http://localhost:3000/store/tq-beauty-atelier-6c97dcf5) | `theme-review-beauty-atelier-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/beauty-atelier-1440.png) | [Image](../.gravitas/sessions/theme-quality/beauty-atelier-390.png) |
| Sport Performance | online_store | [Open](http://localhost:3000/store/tq-sport-performance-6c97dcf5) | `theme-review-sport-performance-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/sport-performance-1440.png) | [Image](../.gravitas/sessions/theme-quality/sport-performance-390.png) |
| Trail Supply | online_store | [Open](http://localhost:3000/store/tq-sport-trail-6c97dcf5) | `theme-review-sport-trail-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/sport-trail-1440.png) | [Image](../.gravitas/sessions/theme-quality/sport-trail-390.png) |
| Active Club | online_store | [Open](http://localhost:3000/store/tq-sport-club-6c97dcf5) | `theme-review-sport-club-6c97dcf5@example.com` | [Image](../.gravitas/sessions/theme-quality/sport-club-1440.png) | [Image](../.gravitas/sessions/theme-quality/sport-club-390.png) |

## Scope and limits

These are local review fixtures, retained so each design can be inspected and edited. Their trial subscriptions expire normally. No existing merchant’s page content or products were reset. No paid services, external deployment, real orders, or new dependencies were introduced. The review checks sampled body-copy contrast and normal responsive flows; it is not a complete accessibility certification or load/security audit.
