# SubTrack Play Store Launch Handoff

**Status:** Project-side preparation is complete; publisher-owned Play Console and legal identity fields remain required before public production launch.

## What is ready in the app

SubTrack now provides an in-app privacy-policy route at `/privacy-policy`, an external-account-deletion route at `/delete-account`, and a cloud-account deletion action for authenticated optional Supabase users. The deletion action removes the remote user and the associated `subtrack_sync_state` backup but deliberately preserves subscriptions held only on the device. The app does not collect bank credentials, inbox content, provider passwords, or provider billing-control data.

The release configuration includes an EAS `production` profile that produces an Android App Bundle, and an internal `preview` profile that produces an Android APK for beta testers. The Android configuration declares `POST_NOTIFICATIONS` only; it no longer includes template audio/video capabilities or microphone access.

## Publisher actions required before the first upload

| Action | What you need to supply or do | Why it is required |
|---|---|---|
| **Permanent package ID** | Confirm a package ID you own, such as `com.yourcompany.subtrack`. It must replace the provisional `com.app.subscription_dashboard_mvp` before the first Play upload. | A package ID cannot be changed after the app is created in Play Console. |
| **Publisher identity** | Provide your legal publisher/developer name and a monitored privacy-support email address. | The policy and Play listing need an identifiable privacy contact. |
| **Public policy URL** | After deployment, use `https://subtrackdash-k768wbpy.manus.space/privacy-policy` only if this remains your final production domain. | Play requires an active, public, non-editable policy URL. |
| **Account-deletion URL** | Enter `https://subtrackdash-k768wbpy.manus.space/delete-account` in the Play Console Data deletion form. | Optional cloud-account users need an external deletion path as well as the in-app path. |
| **Data Safety form** | Describe optional email/display-name and cloud-backup processing by Supabase, local device storage, local reminders, and user-initiated exports exactly as deployed. Declare no ads for launch. | The declaration must match the app, SDKs, and privacy policy. |
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

Your records stay on your device by default. Optional cloud sync is manual and available only when you choose to create an account. SubTrack does not ask for bank accounts, payment-card information, email inbox access, or provider passwords.

### Reviewer access note

`No sign-in is required to review the core app. Subscription tracking, reminders, local export, catalog browsing, and official-management handoffs work without an account. Cloud sync is optional and can be skipped during review.`

## Release sequence

1. Confirm the permanent package ID, legal publisher name, and privacy contact.
2. Update the package ID, deploy the latest build, and confirm both public policy URLs load.
3. Create an internal Android build for real-device testing; verify onboarding, local storage, date selection, notification permission, reminder delivery, calendar share, account creation, email verification, cloud restore, and cloud-account deletion.
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
