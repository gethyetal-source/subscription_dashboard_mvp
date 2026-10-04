# Subscription control features

This guide describes the subscription-control features, their limits, and what is needed to build, deploy, and test them. Android and web are the supported targets. iOS has not been tested.

## Feature overview

| Feature | Route | Platforms | Notes |
|---|---|---|---|
| Quick add | `/quick-add` | Android, web | Minimal entry form. Warns about likely duplicates and requires acknowledgement before saving. |
| Renewal queue | `/renewals` | Android, web | Upcoming renewals, trials, and cancellation follow-ups with actions for each. |
| Renewal reminders | (background) | Android | Several local notifications per subscription: renewal, trial ending, and cancellation follow-up. Not available on web. |
| Backup and restore | `/backup` | Android, web | JSON export/import with validation and a preview before replacing data. The last five pre-change snapshots are kept on the device. |
| Receipt and CSV import | `/import` | Android, web | Receipt text is recognised on the device (ML Kit on Android, Tesseract in a browser worker). Every suggestion must be reviewed before it is saved. |
| Spending and value | `/insights` | Android, web | Per-currency cash-flow forecast, budget position, price-change impact, value checks, and user-recorded savings. |
| Regional plans | `/regional-plans` | Android, web | Manually verified market quotes with source caveats and correction drafts. |
| Privacy controls | `/privacy-controls` | Android, web | Hide amounts on this device. Android-only app lock uses device fingerprint, face, or PIN authentication. |
| Home-screen widget | (Android launcher) | Android | "SubTrack next renewal" widget. Details are hidden while app lock is enabled. |
| Onboarding | `/onboarding` | Android, web | Short introduction to privacy, budget, and reminders. |
| Cloud backup | `/cloud-sync` | Android, web | Optional. Requires Supabase configuration and the migrations below. |
| Household collaboration | `/shared-household` | Android, web | Optional. Owner, editor, and viewer roles with single-use, expiring, email-addressed invitations. Only selected plan fields are shared. |

## Data safety

- Local data stays under the storage key `subtrack.mvp.local-state.v1`. Older saved data is migrated on load and written back as schema version 2.
- All writes go through one queued repository. Malformed saved data is preserved instead of being overwritten, and the app shows a recovery banner.
- Exports, backups, and cloud snapshots strip device-specific reminder identifiers. Reminders are recreated after a restore.
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
| `EXPO_PUBLIC_SUPABASE_URL` | Cloud backup, household collaboration | Public project URL. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cloud backup, household collaboration | Public publishable (anon) key. Never ship the service-role key in the app. |

When these are missing, all local features still work and the cloud screens explain that the feature is not configured.

## Supabase deployment

Apply the migrations in order, after reviewing them:

1. `supabase/migrations/202610040001_subtrack_sync.sql`: per-user snapshot table, row-level security, and the `subtrack_save_snapshot` compare-and-swap function.
2. `supabase/migrations/202610040002_household_collaboration.sql`: household tables, row-level security, role helper, invitation and shared-plan functions, and realtime publication.

Then deploy the `supabase/functions/delete-subtrack-account` Edge Function so in-app account deletion works.

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
