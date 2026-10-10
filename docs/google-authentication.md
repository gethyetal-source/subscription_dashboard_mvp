# Account-only sign-in and Google testing

Google and email/password accounts are required. Sessions are remembered across
launches and refreshed automatically. Subscription records, prices, savings,
country/budget settings, local backups, and household plans are never uploaded.
Supabase Auth stores account/profile details only; a separate profile table is
not needed. No new APK or remote deployment is part of this code-only update.

## 1. Automated checks first

```sh
pnpm test
pnpm check
pnpm lint
```

The authentication tests use synthetic sessions and mocked provider responses.
They test session reopening, Google PKCE callbacks, cancellation, logout,
password recovery, account isolation, and blocked financial transfers.
They are not proof that a real Google provider has been configured.

## 2. Configure Google, outside chat

1. In Google Cloud, configure the OAuth consent screen for your application.
   While the application is in Testing, add the Google accounts you will test
   with as test users.
2. Create an OAuth **Web application** client. This app uses Supabase's browser
   OAuth flow, including on Android, not the native Google Sign-In SDK.
3. Add this exact **authorized redirect URI** to the Google client:

   `https://bpnrosswdgyflviddxjm.supabase.co/auth/v1/callback`

   This is Google's callback to Supabase, not the callback to the app.
4. In that Supabase project's **Authentication → Providers → Google**, enable
   Google and enter the client ID and client secret directly in the dashboard.
   Never add the client secret or a service-role key to the app or chat.
5. Keep Google permissions limited to the default sign-in identity scopes.
   SubTrack does not request inbox, calendar, bank, or payment permissions.

## 3. Configure the app's public connection

Copy `.env.example` to `.env.local`. In that local file, fill
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using the project's **publishable** key.
A legacy `anon` key is also supported. A `service_role` or `sb_secret_` key is
rejected by the client. Restart Metro after changing public environment values.

Required public variables:

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://bpnrosswdgyflviddxjm.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The project's public publishable key |
| `EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN` | Optional; web uses its current origin when omitted |

For local browser testing, add these **allowed redirect URLs** in
Supabase **Authentication → URL Configuration**:

- `http://localhost:8081/oauth/callback`
- `http://localhost:8081/password-reset`

For a deployed website, also add the exact HTTPS versions on your own domain.
Set its Site URL to the website origin. Do not use a wildcard production
redirect or an unconfirmed preview domain.

For a future rebuilt native app, add:

- `subtrack://oauth/callback`
- `subtrack://password-reset`

The new `subtrack` scheme requires a native rebuild. The earlier delivered APK
does not contain this login flow. Expo Go is not the native OAuth test target;
use a development or preview build when Android testing is requested.

Enable email/password sign-in in Supabase too. Test confirmation and password
recovery links in the **same browser or device** where the flow was started,
because PKCE stores its verifier there. If confirmation happened elsewhere,
return and sign in normally with the confirmed email and password.

## 4. Keep the server account-only

Review and apply `supabase/migrations/202610070001_account_only_privacy.sql`
before releasing or testing against a project with the old financial features.
It revokes public-client access to all legacy financial tables and RPCs.
It is safe to apply when those old tables do not exist.

The code-only update does **not** apply this migration to the live project.
It does not erase any old backups or shared plans. Any historical rows require
a separate retention/deletion decision. The updated app cannot read or upload
them even before migration, but older installed apps retain their previous
server permissions until the migration is applied.

Deploy `supabase/functions/delete-subtrack-account` when enabling in-app account
deletion. Its server-only admin credential comes from the Edge Function runtime.
It verifies the caller and deletes only that user's account; foreign-key
cascades also remove that user's legacy remote rows. Do not put an admin
credential in the client. Basic Google sign-in does not require this function.

## 5. Real Google browser test

After configuration, run:

```sh
pnpm exec expo start --web --localhost --port 8081
```

Open `http://localhost:8081/login` directly, not inside an embedded preview.
Complete consent yourself in Google's page.

1. Click **Continue with Google** and select a test Google account.
2. Confirm that SubTrack returns to Overview. In Supabase **Authentication →
   Users**, confirm a Google user and its account details exist.
3. Add a synthetic subscription and reload the browser. The app should reopen
   without another login and show that device-local record.
4. Check that no `/rest/v1/subtrack_*` or financial snapshot RPC requests were
   made. Creating or changing a subscription must not write anything to
   Supabase; account profile edits use the Auth user endpoint only.
5. Open **Settings → Your account → Log out**. Reopen a direct subscription,
   backup, or import URL: login must appear instead of financial data.
6. Sign back into the same Google account: its local records should remain.
7. Log out and use a different account: it must get its own local dataset.
8. Test Google cancellation, email signup/verification, and password recovery.

Real Google sign-in cannot be confirmed by the automated mocks. Android consent,
deep linking, app lock, notifications, and widgets still need real-device tests
after an explicitly requested native build.

## Device-local behavior and limits

- The first account keeps existing pre-login records in place, including
  recovery files. Later accounts use separate local keys. Logout never erases
  these records.
- Logging out hides widget details, cancels scheduled renewal notifications,
  dismisses delivered renewal notifications, and disables financial routes.
  Signing in rebuilds local reminders without adding recovery snapshots.
- Cached sessions allow local tracking during a temporary connection failure.
  Server account operations still need an active, valid session and network.
- Explicit logout, revoked/deleted accounts, clearing app storage, or
  unrefreshable expired credentials may require sign-in again.
- Local data, JSON exports, and the persisted session in AsyncStorage are not
  encrypted. Login and optional app lock are screen-access controls, not
  protection against someone with direct access to the device's storage.
- Before deleting an account, export a local backup. A recreated account has a
  new ID and cannot automatically open the deleted account's local records.

## Verified in this code-only update, 2026-10-07

- 233 offline automated tests passed; one pre-existing legacy logout test is
  skipped. The account-provider logout tests are active and pass.
- TypeScript, ESLint, diff whitespace checks, static web export, and Android
  Hermes JavaScript export passed. This is not an APK build or device test.
- 46 isolated browser checks passed against a synthetic provider. They cover
  Google PKCE redirects/callbacks, email verification, protected direct URLs,
  restart persistence, logout cancellation/confirmation, login after logout,
  preserved local records, account switching, disabled household transfers,
  safe error URLs, and 320px layout.
- Four tested WCAG 2 A/AA browser audits reported zero violations. This is not a
  complete accessibility certification.
- Browser testing found and fixed a repeat-login bug: startup logout cleanup was
  deleting the fresh Google PKCE verifier. A dedicated regression test passes.
- No live Supabase auth configuration, migration, function deployment, or
  financial data deletion was performed. Real Google consent and live
  signup/recovery/account-deletion tests remain pending provider/public config.
