# SubTrack

> **A privacy-first subscription dashboard for discovering services, tracking renewals, comparing plans, and opening official management pages.**

SubTrack is a cross-platform Expo application for people who want a clear view of recurring subscriptions without connecting a bank account, email inbox, or provider password. The MVP is local-first: subscriptions, settings, reminders, and budget preferences stay on the user’s device unless a future optional backup-and-sync feature is enabled.

## Contents

- [Key capabilities](#key-capabilities)
- [Privacy model](#privacy-model)
- [Technology](#technology)
- [Project structure](#project-structure)
- [Run locally](#run-locally)
- [Quality checks](#quality-checks)
- [Deploy the web version to Vercel](#deploy-the-web-version-to-vercel)
- [Create an Android test build](#create-an-android-test-build)
- [Future cloud sync](#future-cloud-sync)

## Key capabilities

| Area | Included in the MVP |
|---|---|
| **Dashboard** | Monthly and annual spend totals, category summaries, renewal/trial indicators, budget progress, a projected six-month trend, insights, search, filters, and persisted sorting. |
| **Discovery** | Curated services across AI, entertainment, music, productivity, cloud, fitness, learning, and gaming, with category filtering and plan comparisons. |
| **Subscription tracking** | Manually add subscriptions, choose plans, set billing source and renewal dates, configure reminders, and update local status. |
| **Fast management** | Quick-edit amount and renewal-date sheet, calendar date picker, required-field validation, and deletion controls restricted to the **Subscriptions** tab. |
| **Provider handoff** | Open each provider’s official management page; SubTrack does not attempt provider-side cancellation. |
| **Personalization** | Light/dark theme, Poppins typography, monthly budget, reminder lead time, and exported local data. |

## Privacy model

SubTrack is intentionally designed to avoid sensitive integrations. It does **not** request or store bank credentials, inbox access, or provider account passwords. Subscription information is entered manually and stored locally with AsyncStorage. Official provider links are a handoff only: users manage or cancel subscriptions on the provider’s own website.

> **Local-first by default:** a future cloud account should be optional and used only for explicit backup and cross-device synchronization.

## Technology

| Layer | Technology |
|---|---|
| App framework | Expo SDK 54, React Native 0.81, React 19 |
| Routing | Expo Router 6 |
| Language | TypeScript 5.9 |
| Web | React Native Web with Metro static export |
| Styling | NativeWind 4 and `StyleSheet` |
| Local data | AsyncStorage |
| Notifications | `expo-notifications` for local renewal reminders |
| Images and fonts | `expo-image` and bundled Poppins font files |
| Tests | Vitest |

## Project structure

```text
app/
  (tabs)/                 # Home, Discover, Subscriptions, Settings
  subscription/           # Add, edit, and subscription detail routes
  service/                # Service detail routes
  compare/                # Plan comparison routes
components/               # Shared UI and date-picker sheet
lib/                      # Catalog, calculations, storage, reminders, theme
assets/                   # App icons, provider assets, and Poppins fonts
tests/                    # Calculation and routing tests
vercel.json               # Vercel static export configuration
```

## Run locally

### Prerequisites

Install a recent Node.js release with Corepack enabled and pnpm available. The repository pins pnpm `9.12.0` in `package.json`.

```sh
git clone <your-repository-url>
cd subscription_dashboard_mvp
corepack enable
pnpm install
```

Start the Expo web development server:

```sh
pnpm dev
```

The project starts Expo on port `8081` by default. To run on a connected Android device or an emulator, use:

```sh
pnpm android
```

## Quality checks

Run these commands before committing a feature:

```sh
pnpm test
pnpm check
```

| Command | Purpose |
|---|---|
| `pnpm test` | Runs the Vitest unit suite. |
| `pnpm check` | Runs TypeScript without emitting output. |
| `pnpm lint` | Runs Expo linting. |
| `pnpm build:web` | Exports the deployable static web site to `dist/`. |

## Deploy the web version to Vercel

SubTrack uses Expo static web export. Vercel must serve the generated `dist` folder—not `public`.

The committed `vercel.json` is:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm build:web",
  "outputDirectory": "dist"
}
```

In the Vercel project settings, verify the following values:

| Vercel setting | Required value |
|---|---|
| **Root Directory** | The folder containing `package.json` and `vercel.json`; leave it empty when both are at the repository root. |
| **Build Command** | `pnpm build:web` |
| **Output Directory** | `dist` |
| **Framework Preset** | Use dashboard auto-detection; do not add an unsupported `framework` field to `vercel.json`. |

After pushing the latest branch to GitHub, trigger a redeploy from Vercel. Expo’s static export writes the production website to `dist/`, which is the folder Vercel must publish [1] [2].

## Create an Android test build

The Vercel deployment is the **web version** only. It does not create an Android APK.

For the managed project workflow, open the latest project checkpoint and select **Publish**. Choose **Android** under **Personal Use & Limited Distribution**, wait for the build to complete, then download the generated APK from the build card.

If building from a local development machine with an Expo account, configure EAS and create a preview build:

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

Use an installable `.apk` for direct tester installation and an `.aab` for Google Play submission [3].

## Future cloud sync

The current MVP does not require authentication or a remote database. If cloud backup is added later, keep it opt-in and preserve local-only use without an account.

**Suggested first cloud stack:** Supabase Auth + Postgres. Apply row-level security to every user-data table, store only a user’s own subscription records and preferences, and never ship service-role or database credentials in the mobile client. An alternative is Firebase Authentication + Firestore for teams that also plan to use Firebase Cloud Messaging.

## Reference links

[1]: https://docs.expo.dev/router/web/static-rendering/ "Expo Router static rendering"
[2]: https://vercel.com/docs/builds/configure-a-build "Vercel build configuration"
[3]: https://docs.expo.dev/build-reference/apk/ "Expo Android APK build guide"
