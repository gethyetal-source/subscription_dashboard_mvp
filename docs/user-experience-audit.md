# SubTrack User-Experience Audit

**Audit date:** 21 August 2026  
**Scope:** A source-led user-journey review covering first use, account creation and verification, recovery, profile access, cloud sync, subscriptions, reminders, shared plans, settings, and catalog handling.  
**Constraint:** This is an **issue list only**. No product behavior, UI, credentials, Supabase settings, or production data was changed.

## How to read this audit

> **Confirmed** items are directly supported by the current implementation. **Validation needed** items are credible customer-facing risks that require a real iOS/Android device and a fresh mailbox test before being called defects.

The automated baseline is healthy: TypeScript passed; 23 tests passed and 1 test is skipped; lint has 0 errors and 3 pre-existing warnings. The automated coverage, however, focuses on utility functions, snapshot safety, and public Supabase configuration. It does not cover a real sign-up, verification email, profile edit, notification delivery, deep-link callback, or device-level recovery journey.

## Priority summary

| Priority | Count | What should be reviewed first |
|---|---:|---|
| P0 — blocking trust or access issue | 4 | Verification feedback, resend/recovery states, profile entry point, unusable catalog-feedback contact |
| P1 — high-friction core journey issue | 12 | Cloud-account management, sync safety, reminders, subscription creation, multi-currency totals, theme consistency |
| P2 — clarity, polish, accessibility, or coverage gap | 15 | Discoverability, status language, catalog fidelity, accessibility, automation coverage |

## P0 — blocking trust or access issues

| ID | Issue | Evidence from the current experience | User impact | Status |
|---|---|---|---|---|
| UX-01 | **There is no profile icon, profile tab, or dedicated profile screen.** | The four persistent tabs are Home, Discover, Subscriptions, and Settings. The root navigator registers no profile route. | A signed-in person has no obvious identity or account destination. This directly matches the reported issue. | Confirmed |
| UX-02 | **The display name collected after sign-up is not visible or editable after setup.** | The cloud provider exposes `profileName`, but the signed-in cloud screen shows only the email; Settings only exposes “Cloud account.” There is no profile editor. | Users cannot confirm what name is saved, correct a typo, or manage basic identity details. | Confirmed |
| UX-03 | **Email-verification feedback is transient and leaves the user in an ambiguous state.** | Creating an account shows a one-time alert: “Check your inbox to confirm your email, then return and sign in.” The screen does not change to a persistent “verification pending” state. | If the email arrives late, is missed, or the alert is dismissed, the user sees the ordinary sign-in form and cannot tell what to do next. | Confirmed |
| UX-04 | **There is no resend-verification action or verification troubleshooting path.** | The sign-in/sign-up card offers Sign in, Create account, and Forgot password only. | A user who receives no email has no self-service resend, change-email, spam-folder guidance, expiry explanation, or status indicator. | Confirmed |
| UX-05 | **The catalog-report path points to `feedback@subtrack.local`.** | Settings instructs the user to email this address. `.local` is not a public email domain. | A person who reports incorrect plans, prices, or management links will receive no usable support path. | Confirmed |

## P1 — account, verification, and cloud-sync issues

| ID | Issue | User-facing consequence | Status |
|---|---|---|---|
| UX-06 | **No friendly error states for common authentication failures.** Raw Supabase errors are surfaced through an alert. | “Email not confirmed,” invalid password, duplicate email, expired link, offline network, and provider outages can feel technical or unclear. | Confirmed |
| UX-07 | **A verification callback without usable access/refresh tokens has no explanatory recovery state.** The callback logic only applies hash-fragment tokens and silently ignores a URL without them. | A confirmation link can land on Cloud sync and still look like nothing happened, especially when a link is expired, altered, or uses a different callback format. | Confirmed |
| UX-08 | **Sign-up does not make it clear that confirmation may be required before sign-in succeeds.** | A user can immediately try the sign-in form, receive an error, and assume account creation failed rather than that verification is pending. | Confirmed |
| UX-09 | **Password recovery is not discoverable from a persistent account area.** It only appears as a mode inside Cloud sync. | Returning users must remember that password changes live under optional cloud sync rather than a profile/account area. | Confirmed |
| UX-10 | **There is no account-management surface for editing display name, email, password, or deleting a cloud account.** | Users lack basic account ownership and privacy controls expected after they create an account. | Confirmed |
| UX-11 | **Cloud sync is only manually initiated and its state is not visible on the Home screen.** | A user can believe their data is protected without knowing whether the latest device changes have been backed up. | Confirmed |
| UX-12 | **The restore decision does not show the cloud snapshot date, item count, or a difference preview before replacing local data.** | Users must approve a destructive replacement without enough information to judge whether the backup is current or appropriate. | Confirmed |
| UX-13 | **There is no conflict or duplicate-device explanation.** | A user who edits records on two devices cannot understand which version wins, whether they must sync first, or how to avoid overwriting newer work. | Confirmed |
| UX-14 | **Resetting local data does not clearly explain that the optional cloud snapshot is still retained.** | A user may assume “Reset local data” removes all SubTrack data, then later restore data they believed deleted. | Confirmed |

## P1 — reminder and subscription-management issues

| ID | Issue | User-facing consequence | Status |
|---|---|---|---|
| UX-15 | **The reminder toggle can look enabled even when the operating system has denied notification permission.** The app stores the setting but schedules no reminder when permission is unavailable. | Users can rely on alerts that will never arrive. There is no visible permission status, repair action, or test notification. | Confirmed |
| UX-16 | **The reminder time is fixed at 09:00 local time and is not disclosed or configurable.** | Users cannot choose a review time, account for travel, or understand why an alert appears at a particular time. | Confirmed |
| UX-17 | **Notification-tap routing is not implemented.** A scheduled reminder contains a subscription URL, but the app has no notification-response listener. | Tapping a notification may fail to open the exact record a user needs to review. | Confirmed |
| UX-18 | **The full add/edit flow is a single, dense form.** It asks for plan, price, cadence, dates, status, billing source, recognition clue, auto-renew, household sharing, reminders, and notes. | First-time users may abandon setup or enter unreliable data because they do not understand which fields are essential now versus useful later. | Confirmed |
| UX-19 | **Trial-end validation is weaker than renewal-date validation.** The trial date only requires a valid date string; it is not visibly constrained to a future date or checked against the renewal date. | A user can create confusing trial data that weakens reminders and Control Center advice. | Confirmed |
| UX-20 | **Custom-subscription creation uses generic validation and silently forces reminders on.** | A user gets less guidance than in the catalog flow and may not realize a local reminder was enabled. | Confirmed |
| UX-21 | **Cancellation tracking is local and can be mistaken for confirmation.** | Although the wording is cautious, users can mark a provider cancellation as pending or confirmed without storing a provider confirmation reference, cancellation end date, or evidence. | Confirmed |
| UX-22 | **Quick edit offers only amount and date, with no explicit reminder impact message.** | A user may reasonably expect a reminder to update but receives no confirmation that it was cancelled and rescheduled. | Confirmed |

## P1 — financial clarity, catalog, and theme issues

| ID | Issue | User-facing consequence | Status |
|---|---|---|---|
| UX-23 | **Summary totals combine amounts from different currencies without conversion.** The app shows a directional-estimate insight only after multiple currencies are already present. | A combined “monthly” or “annual” total can be materially misleading and budget comparisons become unreliable. | Confirmed |
| UX-24 | **Static plan data is reference-only and may diverge by country, tax, platform, or promotion.** | Users can mistake catalog prices for live quotes; the app does not show a plan-data date, region, or confidence indicator. | Confirmed |
| UX-25 | **The catalog is materially smaller than the intended “top 50” scope.** The current catalog contains 23 services. | A large portion of users will be redirected into manual custom entry, reducing the benefit of discovery and plan comparison. | Confirmed |
| UX-26 | **Several non-tab screens use fixed light colors despite a global dark/light setting.** Household and service-detail styles are hard-coded for light surfaces; the root status bar is also fixed to a dark-content style. | Switching themes can produce inconsistent screens and potentially low-contrast system chrome. | Confirmed |

## P2 — navigation, content, and resolve-workflow gaps

| ID | Issue | User-facing consequence | Status |
|---|---|---|---|
| UX-27 | **The main dashboard has no signed-in identity, cloud state, or recent-backup indicator.** | A user cannot distinguish local-only use from cloud-backed use without entering Settings. | Confirmed |
| UX-28 | **Control Center actions are shallow for multi-record problems.** Duplicate prompts open only the first linked record. | A user must manually navigate back and forth to compare duplicate candidates or resolve a multi-step issue. | Confirmed |
| UX-29 | **The service-detail “Already subscribed?” path only presents an alert, not a clear next action.** | Someone who expects a direct official-management route must first create a local record, increasing friction for a simple cancellation or billing check. | Confirmed |
| UX-30 | **Home intentionally shows only a short ledger and a short upcoming-charge strip.** | Users with many services must discover “Manage all” to see the rest; there is no visual indication of hidden count in the ledger area. | Confirmed |
| UX-31 | **Discovery search is limited to catalog name, category, and description.** It does not support common aliases, billing descriptors, plan names, or personal notes. | Users may fail to find a known service and assume it is missing. | Confirmed |
| UX-32 | **Household is a local planning tool, not real shared access.** The wording explains this inside Household, but “shared plans” can still imply invitations, member access, or real reimbursement tracking. | Users may expect family members to see, approve, or pay shares when none of those actions exist. | Confirmed |
| UX-33 | **Household members can be added and removed, but not renamed, invited, or given a contact/reimbursement state.** | Small errors require deletion and re-entry; the model does not support real household coordination. | Confirmed |
| UX-34 | **Accessibility metadata is inconsistent.** Some important controls have labels and roles, but many form inputs, icon controls, cards, and modal close actions rely only on visual text. | VoiceOver/TalkBack navigation and discoverability will be uneven. | Validation needed on device |
| UX-35 | **There is no first-run tour explaining the split between local tracking and optional cloud sync.** | Privacy-first positioning is strong, but a newcomer may not understand why account creation is optional or what happens if they never create one. | Confirmed |
| UX-36 | **No real end-to-end test protects sign-up, verification delivery, callback, profile setup, recovery, notification scheduling, or profile edits.** | Regressions in the most trust-sensitive journeys may reach users even while the existing utility tests pass. | Confirmed |

## What requires live user/device verification

The following should be tested with an actual iOS device, Android device, and a new mailbox before any conclusion is final. This review intentionally did not create another external test account or send emails.

| Test scenario | Why it matters |
|---|---|
| Receive a confirmation email after sign-up; open it cold and with the app already open. | Confirms delivery, deep linking, session setup, and profile prompt behavior. |
| Do not receive the email for 10 minutes. | Confirms whether the current lack of resend and status guidance blocks recovery. |
| Use an expired, duplicated, or forwarded confirmation/recovery link. | Confirms the user receives a comprehensible, actionable explanation. |
| Deny notification permission, then enable “Renewal reminders.” | Confirms the setting does not falsely imply that reminders are active. |
| Tap a delivered local notification. | Confirms whether it opens the relevant subscription record. |
| Switch theme while on Household, service detail, compare, and custom-subscription screens. | Confirms visual consistency, contrast, and status-bar legibility. |
| Create subscriptions in at least two currencies, then set a monthly budget. | Confirms that users understand the totals are not converted. |
| Restore a cloud snapshot over changed local data on a second device. | Confirms whether the destructive-replace language is adequate. |

## Recommended review order

1. **Account and verification:** profile affordance, account hub, pending-verification state, resend/troubleshooting, and friendly auth errors.
2. **Trust and recovery:** password-reset states, cloud-sync status, restore preview, account/data deletion clarity, and permission-aware reminders.
3. **Financial correctness:** multi-currency handling, catalog freshness/coverage, trial-date rules, and external management/cancellation evidence.
4. **Product finish:** theme consistency, accessibility, first-run education, stronger Control Center resolution workflows, and real end-to-end test coverage.

## Test record

| Check | Result |
|---|---|
| TypeScript | Passed |
| Unit tests | 23 passed; 1 skipped |
| Lint | 0 errors; 3 existing warnings |
| Live e-mail send/callback run in this audit | Not performed to avoid creating external accounts or sending mail during a review-only request |
| Browser preview testing | Not performed because this is a mobile project; audit findings are source-led and need device validation where marked |
