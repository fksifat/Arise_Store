# Account-first website setup

Registration at `/register` collects name, email, password and password confirmation. Merchant registration requires at least 8 characters on both the form and API. Registration creates only the account and its existing HTTP-only cookie session; it does not create a tenant or start a website trial.

`/login` keeps email/password sign-in and the demo quick-fill controls when development demo mode is enabled. Platform administrators still go to `/admin`. Existing store owners open their dashboard; accounts without an owned store resume saved setup or start their first website. Website type/theme selections from public registration links survive registration and sign-in for accounts with an available store slot.

## Four setup screens

1. Website type: the seven existing types, with business website as the default.
2. Website name and URL: Bangla names are supported; URLs use English letters, numbers and dashes. Editing a name preserves an explicitly chosen different URL.
3. Theme: compatible presets from the existing shared catalogs.
4. Review: create a private website using the existing membership, theme, starter page, domain and subscription flows. The 14-day trial begins here. Publication remains explicit in the dashboard.

Completed steps and field edits save to the authenticated account via `GET/PUT /api/v1/setup`. Autosave waits 500 ms after editing; **All changes saved** confirms the server response. An unsaved edit triggers the browser's normal leave-page protection. Back/Continue and Save and sign out wait for persistence before proceeding. Returning in another browser and signing in loads the same saved step and values.

Each account can create one owned website. Store Portfolio shows the used slot, and additional-store creation and limit upgrades are locked. Owners at the limit cannot start another setup, even through a direct setup URL or API request. Members of other stores can still create their first owned website. An active draft takes priority over a newly supplied theme hint, so opening a marketing link does not overwrite unfinished work.

## Storage and rollout

Apply migration `0005` before starting the updated API. It adds `setup_drafts`, keyed by the authenticated user's ID, with a cascading user foreign key. Drafts contain only step, website type, name, slug and theme key. Unknown fields are rejected; credentials are never stored in setup drafts. A different account cannot read or replace another account's draft.

The existing website-create API accepts the optional `complete_setup` flag. With this flag, successful creation clears that owner's setup draft in the same database transaction. Other creation paths preserve unfinished setup. Validation errors, unavailable themes, reserved/duplicate URLs and failed creation keep the draft available for correction. If the browser loses a successful creation response, it checks the cleared draft and matching owned website before opening the dashboard.

Local demo accounts are opt-in (`APP_ENV=development`, `SEED_DEMO_DATA=true`). Existing production guards continue to reject demo seeding and hide demo buttons. No auth/session format, public website, checkout or payment behavior was replaced.

One unfinished website setup is stored per account. Simultaneous editing from multiple devices uses the last completed save; drafts do not have concurrent-edit merging.

## Verification — 2026-10-28

- API suite: 146 passed, 1 optional skipped, including account isolation, draft validation, atomic completion/failure, password boundaries, administrator password rules and remembered sessions.
- Fresh SQLite migration upgrade through `0005` and Alembic schema check passed. PostgreSQL validation runs in the hosted Verify workflow; PostgreSQL was unavailable locally.
- Production build and TypeScript checking passed. The complete production-preview browser suite passed 33 tests using Chrome, including explicitly enabled local demo logins. One optional private-manifest theme review was skipped. The run uses normal API rate limits with browser pacing.
- Browser coverage includes the four-step setup, a fresh browser context resuming progress, logout/re-login at review, duplicate URL recovery, auth spacing/password strength/policy links, checkout, orders, reports, billing requests, site switching and page publication.
- Responsive auth checks at 320/390/768/1440px and short landscape layouts passed. Desktop/mobile screenshots were inspected.
- Only generated test accounts and their audit events were cleaned through the existing fixture cleanup. Requested local demo accounts remain enabled. Generated screenshots and local environment/database files are excluded from this release.

The one-store limit applies across website types and counts draft, published, suspended and archived stores. Creation serializes on the user row before checking ownership so simultaneous requests cannot create two stores. Existing multi-store accounts and memberships remain accessible, but cannot create additional stores; their actual occupied count is shown instead of hiding legacy stores. No automatic store deletion or schema migration is introduced.

## Store-limit verification — 2026-10-28

- Full API suite: 153 passed, 1 PostgreSQL-only checkout test skipped locally. Store-limit tests cover first/second store creation, simultaneous requests, memberships, draft/published/archived/suspended stores, draft retention and access to pre-existing multi-store accounts.
- TypeScript and production build passed. Final production-preview Chrome suite: 43 passed, 1 optional private-manifest review skipped. Coverage includes first-store setup/resume, API/setup bypass attempts, portfolio locks and responsive layout, legacy workspace switching, sidebar collapse/pinning and header alignment, all website types, auth, checkout, billing and editor publication.
- PostgreSQL concurrency was not executed locally; the same owner-row transaction is used on PostgreSQL and SQLite. No new schema migration is needed.
- Generated test accounts were removed using the fixture cleanup; existing store data and requested demo accounts were preserved. Deployment remains separate from this change.
