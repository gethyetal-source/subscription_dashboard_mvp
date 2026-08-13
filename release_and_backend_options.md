# SubTrack: Android APK, Authentication, and Database Plan

## The short answer

**Vercel deployment and an Android APK are separate deliverables.** Vercel can host the web version of SubTrack and a server/API, but it does not convert the Expo application into an Android package. For an installable Android build, use **Expo Application Services (EAS) Build**. EAS’s free plan currently includes 15 Android builds per month, which is sufficient for initial testing [1].

For this privacy-first MVP, keep `AsyncStorage` as the default local-only mode. Add cloud accounts only as an explicit **Backup & sync across devices** option. The simplest temporary cloud stack is **Supabase Auth + Supabase Postgres**, because it combines account management and a relational database in one service.

## Android release path

| Goal | Recommended output | Command/profile |
|---|---|---|
| Install directly on Android test devices | `.apk` | `preview` profile with `android.buildType: "apk"` |
| Upload to Google Play production or testing track | `.aab` | `production` profile |
| Host the web version | Vercel deployment | Existing web export/deployment workflow |

EAS builds an Android App Bundle (`.aab`) by default. That is appropriate for Google Play, but an `.aab` cannot be installed directly. A profile with `android.buildType` set to `apk` creates an installable `.apk` [2].

### One-time setup

First, work from the GitHub clone on your own computer. Do not rely on the Vercel build to produce native binaries.

```sh
git clone <your-repository-url>
cd subscription_dashboard_mvp
pnpm install
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

Before the first public build, make sure `app.config.ts` has an Android package name that you control, such as `com.yourcompany.subtrack`. Treat that identifier as permanent once the app is distributed.

Create `eas.json` at the project root:

```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

Build a tester APK with:

```sh
npx eas-cli@latest build --platform android --profile preview
```

When the build finishes, open the generated URL on an Android phone, download the APK, approve installation from that source if Android requests it, and install. For Google Play, create the production bundle instead:

```sh
npx eas-cli@latest build --platform android --profile production
```

EAS supports both internal build sharing and app-store submission; its build service can also manage Android signing credentials [3].

> **Do not use an APK for Google Play distribution.** Use the `.aab` production build for Play Console, and reserve the `.apk` preview build for direct tester installation.

## What Vercel should do

Keep Vercel for the **web version**, landing page, and optionally a small server/API. A native APK must call a publicly reachable HTTPS backend; it cannot use `localhost` or a Vercel preview-only URL embedded at build time.

If you use Vercel for API routes, put only non-sensitive `EXPO_PUBLIC_*` values in the Expo client configuration. Keep database admin keys, signing keys, and service-role keys in Vercel’s server-side environment variables. Never package them inside the APK.

## Free temporary authentication and database options

| Stack | Free tier currently relevant to SubTrack | Best fit | Caveat |
|---|---|---|---|
| **Supabase Auth + Postgres** | 50,000 MAUs, 500 MB database, 1 GB storage, 2 active projects [4] | **Recommended:** one provider, SQL, Auth, row-level security, easy per-user subscription records | Free projects pause after one week of inactivity [4] |
| **Firebase Auth + Firestore** | Non-phone authentication up to 50,000 MAUs; Firestore has 1 GiB storage, 50,000 reads/day, and 20,000 writes/day [5] | Best when you expect to add FCM push messaging, Google ecosystem tools, or offline document sync | Firestore is NoSQL; phone authentication has different billing requirements [5] |
| **Clerk + Neon Postgres** | Clerk Hobby supports 50,000 monthly retained users; Neon Free provides 0.5 GB storage and 100 compute-hours per project [6] [7] | Polished authentication UI plus Postgres, useful if you want provider separation | More integration work; connect the app to Neon through a server/API, not directly with database credentials |

### Recommended temporary architecture: Supabase

For SubTrack, use **Supabase** if users need optional sign-in, cross-device backup, and restored subscription data. The initial schema can be small:

| Table | Essential fields | Access rule |
|---|---|---|
| `subscriptions` | `id`, `user_id`, service/plan fields, amount, cadence, renewal date, reminder preferences, timestamps | A signed-in user may only read and write rows where `user_id = auth.uid()` |
| `user_settings` | `user_id`, budget, theme, reminder lead time, sort order | A signed-in user may only read and write their own row |

Enable **Row Level Security (RLS)** on every user-data table before connecting the mobile app. The client may use the Supabase URL and anonymous/public key, but it must never contain a service-role key. Keep any administrative operation in a Vercel server route or another trusted server environment.

## Recommended rollout

1. **Now:** Build a preview APK and test the current offline-first app with 10–20 Android users. No authentication or database is needed for this step.
2. **Next:** Add an optional “Back up and sync” feature using Supabase email magic link and/or Google sign-in. Continue supporting local-only use without an account.
3. **Before public launch:** Add per-user RLS policies, export/delete-account flows, error monitoring, and a production `.aab` for Play Console testing.

## References

[1]: https://expo.dev/pricing "Expo Application Services pricing"
[2]: https://docs.expo.dev/build-reference/apk/ "Expo: Build APKs for Android Emulators and devices"
[3]: https://docs.expo.dev/build/introduction/ "Expo: EAS Build"
[4]: https://supabase.com/pricing "Supabase Pricing"
[5]: https://firebase.google.com/pricing "Firebase Pricing"
[6]: https://clerk.com/pricing "Clerk Pricing"
[7]: https://neon.com/pricing "Neon Pricing"
