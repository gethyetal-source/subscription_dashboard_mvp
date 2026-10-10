# SubTrack Play Store Launch Handoff

**Status:** Required Google/email account login is implemented in code. Google provider setup, live login tests, native device checks, publisher-owned Play Console, and legal identity fields remain required before public production launch.

## What is ready in the app

SubTrack provides public privacy and account-deletion routes. Google or email/password login is required and remembered. Supabase stores account details only; financial uploads and cross-device sharing are disabled. Account deletion removes only the caller's remote user/profile, with cascades for any legacy remote rows, and preserves local records. Export a local backup first: a recreated account has a new ID. The app does not collect bank credentials, inbox content, provider passwords, or provider billing-control data. See [google-authentication.md](google-authentication.md).

The release configuration includes an EAS `production` profile that produces an Android App Bundle, and an internal `preview` profile that produces an Android APK for beta testers. The Android configuration declares `POST_NOTIFICATIONS` only; it no longer includes template audio/video capabilities or microphone access.

## Publisher actions required before the first upload

| Action | What you need to supply or do | Why it is required |
|---|---|---|
| **Permanent package ID** | Confirm a package ID you own, such as `com.yourcompany.subtrack`. It must replace the provisional `com.app.subscription_dashboard_mvp` before the first Play upload. | A package ID cannot be changed after the app is created in Play Console. |
| **Publisher identity** | Provide your legal publisher/developer name and a monitored privacy-support email address. | The policy and Play listing need an identifiable privacy contact. |
| **Public policy URL** | After deployment, use `https://subtrackdash-k768wbpy.manus.space/privacy-policy` only if this remains your final production domain. | Play requires an active, public, non-editable policy URL. |
| **Account-deletion URL** | Enter the final website's `/delete-account` URL in the Play Console Data deletion form. | Account users need an external deletion path as well as the in-app path. |
| **Data Safety form** | Describe required account/email/display-name/provider processing by Supabase and Google, device-local financial storage, local reminders, and user-initiated exports exactly as deployed. Do not claim financial cloud sync. Declare no ads for launch. | The declaration must match the app, SDKs, and privacy policy. |
| **Store listing** | Upload final app icon, phone screenshots, feature graphic, short/full descriptions, support email, target audience, and content rating. | Required Play listing and App content setup. |
| **Tester programme** | If your personal developer account is subject to Google’s new-account rule, keep at least 12 testers opted into a closed test for 14 continuous days. | Required before production access for affected personal accounts. |

## Draft Play listing copy

### App name

`SubTrack: Subscription Tracker`

### Short description

`Track renewals, plans, costs, and shared subscriptions privately on your device.`

### Full description

SubTrack is a privacy-first subscription organizer for the services you choose to track. Add subscriptions manually, see renewal dates and estimated recurring costs, record expected charges and price changes, and compare plans using provider references.

Use local renewal reminders, household allocations, decision plans, trial-to-paid countdowns, cancellation evidence notes, and a private charge-recognition worksheet. SubTrack can open official provider-management pages, but it never cancels a subscription or changes a provider account for you.

Sign in once with Google or email. Your subscription records stay on this device and are not uploaded to Supabase. Supabase stores account details only. SubTrack does not ask for bank accounts, payment-card information, email inbox access, or provider passwords.

### Reviewer access note

`Sign-in is required. Provide reviewer access through Play Console's protected App access fields, never in source control. Subscription tracking, reminders, export, and household cost splits use device-local data. There is no financial cloud sync.`

## Release sequence

1. Confirm the permanent package ID, legal publisher name, and privacy contact.
2. Update the package ID, deploy the latest build, and confirm both public policy URLs load.
3. When a build is explicitly requested, test Google consent/deep links, email verification, persistent sessions, logout, local account isolation, password recovery, account deletion, notification/widget privacy, local backup, and the existing subscription workflows on a real device.
4. Create the Play Console application, upload the signed production App Bundle, complete App content and Data Safety, and resolve every pre-launch report item.
5. Run the required closed test if it applies to your developer account; summarize testers’ real feedback when requesting production access.
6. Submit a staged production rollout rather than a full rollout on day one.

## Evidence to retain

Keep screenshots of the privacy policy, account deletion confirmation, the Data Safety answers, release bundle version, internal/closed-test feedback, and your Play Console pre-launch report. This makes later policy updates and release reviews faster.

## References

1. [Google Play User Data Policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
2. [Google Play Account Deletion Requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
3. [Google Play App Content Review Setup](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en)
4. [Google Play Target API Requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
5. [Google Play Personal Account Testing Requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
