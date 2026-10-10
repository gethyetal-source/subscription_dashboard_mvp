# Subscription control features

This guide describes the subscription-control features, their limits, and what is needed to build, deploy, and test them. Android and web are the supported targets. iOS has not been tested.

**Current account policy:** Google or email/password sign-in is required and
remembered. Supabase stores account details only. Financial uploads, cloud
restore, and cross-device household sharing are disabled. See
[google-authentication.md](google-authentication.md) for setup and test steps.

## Feature overview

| Feature | Route | Platforms | Notes |
|---|---|---|---|
| Quick add | `/quick-add` | Android, web | Service search, custom entry, and import entry point. Warns about likely duplicates and requires acknowledgement before saving. |
| Renewal queue | `/renewals` | Android, web | Upcoming renewals, trials, and cancellation follow-ups with actions for each. |
| Renewal reminders | (background) | Android | Several local notifications per subscription: renewal, trial ending, and cancellation follow-up. Not available on web. |
| Backup and restore | `/backup` | Android, web | JSON export/import with validation and a preview before replacing data. The last five pre-change snapshots are kept on the device. |
| Receipt and CSV import | `/import` | Android, web | Receipt text is recognised on the device (ML Kit on Android, Tesseract in a browser worker). Every suggestion must be reviewed before it is saved. |
| Spending and value | `/insights` | Android, web | Per-currency cash-flow forecast, budget position, price-change impact, value checks, and user-recorded savings. |
| Regional plans | `/regional-plans` | Android, web | Manually verified market quotes with source caveats and correction drafts. |
| Privacy controls | `/privacy-controls` | Android, web | Hide amounts on this device. Android-only app lock uses device fingerprint, face, or PIN authentication. |
| Home-screen widget | (Android launcher) | Android | Details are hidden while logged out, recovering a password, or using app lock. |
| Onboarding | `/onboarding` | Android, web | Short introduction to privacy, budget, and reminders. |
| Country and currency | Settings | Android, web | Search countries/territories and save the default currency for new entries. Existing prices and nonzero budgets are preserved. |
| Account login | `/login` | Android, web | Google and email/password, with persistent sessions and password recovery. |
| Former cloud backup | `/cloud-sync` | Android, web | Compatibility redirect to account/login. No financial transfers. |
| Household allocations | `/household` | Android, web | Device-local cost splits only. Cross-device sharing is disabled. |

## Navigation and customer-facing content

The main navigation has three tabs: Overview, Subscriptions, and Insights. Settings is a header action. Add contains service discovery and imports. Plan comparisons, regional quotes, and history live in subscription/service details. Billing references and charge recognition are secondary Subscriptions actions. Account management is in Settings. Financial routes require a signed-in account.

Business-model proposals are internal notes in `docs/membership-strategy.md`, not an app screen. The theme preview is in `components/dev/theme-lab.tsx`, outside the public routes. Deployment instructions and database revision counters must not appear in customer-facing screens.

The dashboard labels monthly equivalents separately from date-based payment forecasts. It orders attention by deadline, keeps currency totals separate, and compares the budget only against its saved currency. Overdue trial checks and cancellation follow-ups remain visible, including follow-ups on archived subscriptions. Plans with auto-renew disabled are not projected beyond their saved renewal date.

The branded launch animation uses “Spend on what matters. Save the rest.” It plays on every fresh launch. Its 1.6-second visible hold starts after the native splash clears, not while the static splash covers it. Reduced motion skips the hold and animated entrance, pulse, and fade. It does not bypass the Android app lock or expose records while privacy preferences load.

Settings → Country & currency saves an offline country/territory choice and its default currency. New entries use it unless an explicit imported currency is present. Existing subscription prices, savings, and nonzero budgets are not converted or relabelled. Overview and Insights keep other currencies separately selectable. See [country-currency-data.md](country-currency-data.md) for data provenance.

Reset, logout, and account deletion use explicit confirmation dialogs on both Android and web. Amount entry accepts decimal points or decimal commas but rejects malformed text instead of truncating it.

## Data safety

- The first account retains existing local data under `subtrack.mvp.local-state.v1`; later accounts use separate account-scoped keys. Older saved data is migrated on load and written back as schema version 2. Logout never erases it.
- All writes go through one queued repository. Malformed saved data is preserved instead of being overwritten, and the app shows a recovery banner.
- Local exports and backups strip device-specific reminder identifiers. Reminders are recreated after a restore or login and paused after logout.
- Mixed currencies are never added together or converted. Budgets apply only to the budget currency.
- **Limitation:** local storage and exported files are not encrypted. Hide amounts and app lock protect the screen, not the stored data.

## Receipt and CSV import limits

- CSV files need `date`, `merchant` (or `description`/`name`), and `amount` columns. Dates must be `YYYY-MM-DD`. The limit is 1,000 rows.
- Amounts such as `10,50` are read as a decimal comma, and `1,234.50` as a thousands separator. Ambiguous values such as `1,234` are rejected rather than guessed.
- A `$` sign alone does not set a currency, and receipt dates are never used as renewal dates.
- Browser OCR downloads Tesseract language data the first time it runs. The receipt image itself is not uploaded.

## Configuration

| Variable | Required for | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Account sign-in | Public HTTPS project URL. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Account sign-in | Public publishable (anon) key. Never ship the service-role key in the app. |
| `EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN` | Web callbacks, optional | Exact public HTTPS origin, or local development origin. Defaults to the current browser origin. |

When the required connection is missing, the login page explains that sign-in is unavailable. Financial screens remain protected; existing device records are not erased.

## Supabase deployment

The earlier financial migrations are historical:

1. `supabase/migrations/202610040001_subtrack_sync.sql`: per-user snapshot table, row-level security, and the `subtrack_save_snapshot` compare-and-swap function.
2. `supabase/migrations/202610040002_household_collaboration.sql`: household tables, row-level security, role helper, invitation and shared-plan functions, and realtime publication.

The current account-only update adds `supabase/migrations/202610070001_account_only_privacy.sql`.
Apply it after review to revoke access to legacy financial tables and RPCs.
It does not erase existing rows and works without the older tables too.
Deploy `supabase/functions/delete-subtrack-account` so in-app account deletion works.
No live migration or function deployment is performed by this code-only update.

The migrations use `create table` and `create function`. If an earlier version of `subtrack_sync_state` already exists in the project, compare its schema with the migration and adapt the migration before applying it.

## Android build

The `preview` EAS profile produces an installable APK:

```sh
npx eas-cli@latest build --platform android --profile preview
```

- The app uses a custom entry point (`index.js`) that registers the widget task before Expo Router starts.
- Native modules added by these features (ML Kit text recognition, local authentication, Android widget, document and image picker) require a new native build. An over-the-air update is not enough.
- Builds are signed with the EAS-managed keystore. Keep using the same EAS project so new APKs install over earlier ones.

## Testing

| Command | Covers |
|---|---|
| `pnpm test` | Offline unit tests, including Supabase migration security tests that run against an in-process PostgreSQL (PGlite). |
| `pnpm test:integration` | Live Supabase connectivity. Requires the environment variables above. |
| `pnpm check` | TypeScript. |
| `pnpm lint` | ESLint. |
| `pnpm build:web` | Static web export. |

Manual checks still needed on a device: notification delivery and tapping through to a subscription, app lock after leaving the app, widget placement and refresh, Android OCR on real receipts, and backup export/import through the system share sheet.

### UI cleanup validation, 2026-10-05

- TypeScript, lint, web export, Android bundle export, and diff whitespace checks passed.
- Offline tests: 107 passed, one existing logout test skipped. Live Supabase integration tests were not run.
- Isolated browser checks at 320 px, 390 px, and 1280 px covered the main layouts, light/dark themes, adding a subscription with a decimal comma, strict quick-edit validation, saving a budget, recording savings, cancellation follow-ups, cancelling a reset without data loss, and confirming a reset.
- The automated Home accessibility scan reported no violations. Checks for focus and contrast on hidden tab screens were incomplete and need manual review.
- No new APK was built or installed in this cleanup. Android-only behavior and signed-in cloud/household flows still need device or integration testing.

### Emerald redesign validation, 2026-10-05

- TypeScript, lint, diff whitespace checks, static web export, and Android Hermes bundle export passed.
- Offline tests: 129 passed; one existing logout test skipped. Live Supabase integration tests were not run.
- 89 isolated browser checks passed. They covered separate currency totals, hidden amounts, budget validation, search/status filters, custom/free plans, strict quick edits, provider-handoff cancellation, pending/confirmed cancellation records, archived edits, renewal/value decisions, savings entry/removal, and reset cancellation/confirmation.
- First-launch recording showed the branded introduction. Observed readiness was about 1.35 s for the first launch, 0.34 s for a repeat launch, and 0.35 s with reduced motion in the cached browser. These are test observations, not device performance guarantees.
- Main layouts at 320 px and 1280 px had no detected horizontal clipping. Phone screenshots use 390 × 844 and synthetic records, not live price quotes.
- Automated WCAG 2 A/AA scans reported zero violations on the tested Overview, Subscriptions, Insights, Add, detail, Settings, and privacy screens in the checked themes. Icon glyph/gradient contrast remained an incomplete automated check; palette and hero-label contrast have unit coverage. This is not a complete accessibility certification.
- No new APK was built or installed. Android notifications, authentication, widget, native OCR, and signed-in cloud/household flows still need device/integration checks. The previously delivered APK and Windows patch do not include this redesign.

### Launch fix and country/currency validation, 2026-10-06

- The animated intro now plays on every fresh app launch, rather than using a one-time seen flag. Native splash fading is disabled, and the animation clock starts after fonts are ready, the native hide request completes, and two paint frames pass.
- Nine native-component regression tests cover a delayed splash handoff, repeat mounts, delayed/error fonts, data/privacy readiness, reduced motion, a rejected hide request, unmount cleanup, and the web path. These use mocked native APIs, not a physical Android device.
- Offline tests: 162 passed; one existing logout test skipped. Type checking, lint, whitespace validation, web export, and Android Hermes export passed. Live Supabase integration checks were not run.
- 51 isolated browser checks passed. They covered repeated visible introductions, reduced motion, saved country selection, country-derived new-entry currencies, explicit imported currencies, existing-record/savings/budget preservation, regional/correction defaults, 320px layout, and keyboard access to the bundled country-data license.
- Automated accessibility scans reported no violations on the six tested country/settings/license views. Some icon contrast checks remain incomplete and require manual review.
- The replacement preview APK uses the existing EAS project/signing credentials, with automatic Android version-code increments enabled. Physical-device launch timing, notifications, app lock, widget, and native OCR still require installation checks.

### Account-only Google/email authentication validation, 2026-10-07

- 233 offline tests passed; one pre-existing legacy logout test skipped. Required
  remembered sessions, email signup/recovery, PKCE safety, explicit logout,
  device-local account isolation, widget privacy, reminder cleanup, and denied
  financial transfers have active regression coverage.
- TypeScript, lint, whitespace checks, web export, and Android Hermes export
  passed. No APK was built and no remote configuration or migration was applied.
- 46 synthetic-provider browser checks passed, with zero violations in the four
  tested accessibility audits. Google login after logout and failed-callback URL
  cleanup were fixed and verified.
- Real Google consent, live account actions, and native-device authentication
  remain pending setup and testing. See [google-authentication.md](google-authentication.md).
