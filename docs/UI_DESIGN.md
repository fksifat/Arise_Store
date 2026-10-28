# Frontend visual system

The platform uses a cool white ground, ink typography and a blue action accent. Manrope and Noto Sans Bengali are self-hosted under `apps/web/public/fonts`, with their open font licenses. No remote font service or new runtime dependency is required. Individual website/storefront palettes and intentional serif headings remain theme-specific.

`globals.css` owns the shared tokens and explicitly scoped `.platform-ui`, `.marketing`, `.merchant-dashboard`, `.auth-shell` and `.admin-shell` treatments. Public storefronts keep their existing theme styles; their sans family inherits `--font-ui`. Theme colors, saved branding, checkout, authentication and publishing logic are unchanged.

Glass appears on overlapping navigation, authentication panels, dialogs and sticky storefront headers. Navigation frost and masked edge light use separate pseudo-elements. Browsers without backdrop filtering receive opaque surfaces. Reduced transparency, forced colors and reduced motion have explicit fallbacks. This is CSS frost and background-responsive edge lighting.

## Local verification — 2026-10-28

- TypeScript typecheck passed.
- Production Next.js build passed, including all 36 theme preview routes.
- 138 Chromium assertions: homepage/login/register at 320, 390, 768 and 1440px; real local owner registration and website creation; all 12 commerce dashboard routes at those widths; menu/Escape behavior, pricing/type/category controls, self-hosted font loading and reduced motion. No browser runtime errors in this run.
- 293 Chromium assertions: all 36 theme previews return HTTP 200 and fit the viewport at four widths (288 checks); forced-colors fallback (1); admin layout at four widths using intercepted sample API responses (4).
- 6 Chromium modal/form assertions: mobile product dialog bounds, focus containment, Escape dismissal, category dialog opening and password visibility.
- Glass test: fixed red versus blue backdrop with unchanged navigation CSS. At edge pixel (200,79), screenshots changed from RGB (244,218,213) to (209,220,241). Temporary test backdrops were removed.
- Desktop/mobile screenshots inspected for homepage, workspace, admin, representative website themes and Bengali rendering. Local scripts, screenshots and detailed browser logs are in ignored `output/playwright/`.

These checks exercise visual layout and selected interactions. They do not establish Safari/Firefox parity, a full accessibility audit, payment behavior or production PostgreSQL compatibility. Admin checks use sample data and do not perform privileged actions. Local review accounts and draft sites were created only in `.data/arise.db`; they are not customer or production data. No push or deployment was performed.

## Final release checks

The final footer passed 37 additional Chromium assertions covering 320/390/768/1440px bounds, all seven website-type links, CTA, section anchors and back-to-top behavior. The body-only extension hydration fix passed TypeScript checking and a Chromium test that injected `cz-shortcut-listen` before hydration, found zero hydration warnings, and verified theme controls remained interactive. The final production build also passed after both changes.
