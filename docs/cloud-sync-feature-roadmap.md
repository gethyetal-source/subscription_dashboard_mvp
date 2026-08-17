# SubTrack Cloud Sync and Product Roadmap

## Product decision

SubTrack should remain **local-first**, but add an optional account for users who want cloud backup and cross-device sync. This protects the product’s privacy promise while eliminating the main limitation of device-only storage: subscriptions cannot be restored after a phone is replaced or used across devices.

> **Recommended launch architecture:** use **Supabase Auth + Postgres + Row Level Security (RLS)** for cloud accounts and user data. Keep AsyncStorage as the immediate offline cache and source of truth before first login.

Supabase Auth supports email/password, passwordless email, social login, and other provider options; its tokens can scope database access through RLS policies [1]. RLS enforces user-by-user access rules at the database layer and must be enabled on exposed user-data tables [2].

## Cloud-platform recommendation

| Option | Strengths | Limits | Recommendation |
|---|---|---|---|
| **Supabase Auth + Postgres** | Relational data model fits subscriptions, budgets, statuses, and dates; integrated Auth; RLS; good Vercel and Expo compatibility | Requires deliberate offline-sync and RLS design | **Recommended for SubTrack** |
| **Firebase Auth + Firestore** | Strong mobile SDKs, live updates, and offline cache | NoSQL data modeling and security rules add complexity for reports and relational data | Good alternative if Firebase Cloud Messaging becomes central |
| **Current device-only storage** | Maximum privacy and zero account friction | No restoration or cross-device synchronization | Keep as anonymous mode, not the only mode |

Cloud Firestore is a viable alternative: it supports real-time synchronization, offline use, and protection through Firebase Authentication and security rules [3]. However, SubTrack’s subscriptions, plans, budgets, and reports are more naturally represented in Postgres.

## User experience and authentication

The account should be optional. A new user can start tracking immediately; after adding the first subscription, offer a non-blocking prompt:

> **Back up your subscriptions?** Create a free account to restore them on a new phone and keep devices in sync.

| Entry point | Recommended behavior |
|---|---|
| First launch | Continue without an account; show a subtle “Back up” affordance. |
| Settings | “Back up and sync” opens authentication. |
| Sign-up | Start with email magic link and Google sign-in; add Apple sign-in before iOS public launch if required. |
| First successful sign-in | Ask whether to upload the current local subscriptions or replace them with cloud data. |
| Additional device | Download cloud data, then merge only non-conflicting local changes. |
| Sign-out | Offer “Keep a local copy” or “Remove local app data”; do not delete cloud data by default. |

## Recommended cloud data model

Use the Supabase Auth user UUID as the owner key. Amounts should be stored in **minor currency units** (`amount_minor`) to avoid floating-point rounding errors.

| Table | Purpose | Core fields |
|---|---|---|
| `profiles` | User profile and preference metadata | `id`, `display_name`, `default_currency`, `timezone`, `created_at`, `updated_at` |
| `subscription_records` | A user’s tracked subscriptions | `id`, `user_id`, `service_id`, `plan_id`, `plan_name`, `amount_minor`, `currency`, `cadence`, `renewal_date`, `trial_end_date`, `status`, `billing_source`, `reminder_enabled`, `reminder_lead_days`, `notes`, `version`, `updated_at`, `deleted_at` |
| `user_settings` | Dashboard and reminder settings | `user_id`, `monthly_budget_minor`, `theme_preference`, `dashboard_sort`, `notification_preferences`, `updated_at` |
| `sync_devices` | Diagnostics and device-level sync context | `id`, `user_id`, `device_name`, `platform`, `last_synced_at`, `created_at` |
| `subscription_change_log` | Optional future conflict/audit support | `id`, `subscription_id`, `user_id`, `operation`, `version`, `changed_at` |

The provider catalog should remain version-controlled application content at first. Only move it to cloud tables when an admin console, regional pricing updates, or user-submitted provider corrections require it.

### Essential indexing

Create indexes for `subscription_records(user_id, status)`, `subscription_records(user_id, renewal_date)`, and `subscription_records(user_id, updated_at)`. They support the dashboard, upcoming-renewal list, and incremental synchronization.

## Security rules

Every user-data table needs RLS enabled. A signed-in user can only select, insert, update, and delete their own records; `user_id` must match `auth.uid()`. Supabase documents RLS as the mechanism for per-row authorization and cautions that service keys must never be exposed to browser or mobile clients [2].

| Boundary | Rule |
|---|---|
| Mobile/web client | Uses only the Supabase project URL and publishable/anonymous key. |
| User data access | RLS policy requires an authenticated user whose `auth.uid()` equals the record owner. |
| Privileged work | Server-only; store any service-role key only in Vercel/server environment variables. |
| Admin analytics | Aggregate only; never return another user’s raw subscription records. |
| Account deletion | Delete profile-linked records, revoke sessions, and confirm completion to the user. |

### Baseline policy shape

```sql
alter table public.subscription_records enable row level security;

create policy "Users manage only their own subscriptions"
on public.subscription_records
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

Apply the same ownership pattern to `profiles`, `user_settings`, and `sync_devices`.

## Local-to-cloud migration and sync

Do not replace AsyncStorage in one release. Introduce synchronization in stages:

1. **Local schema stability:** keep the existing local record IDs and add `updatedAt`, `version`, and optional `deletedAt` fields.
2. **One-time migration:** after consent, upload the local subscription list and settings as the first cloud snapshot.
3. **Offline outbox:** queue creates, updates, and deletes locally whenever the device is offline.
4. **Incremental sync:** when online, upload queued changes and fetch rows changed after `lastSyncedAt`.
5. **Conflict policy:** use the newest `updatedAt` plus a monotonically increasing `version`. If two devices edit the same field, present a small review screen rather than silently losing a change.
6. **Tombstones:** preserve `deletedAt` temporarily so a deletion syncs to other devices; purge only after a defined retention window.

> Local notification scheduling should remain on-device. The cloud database stores reminder preferences and dates, while each device schedules its own local notification after sync.

## Best next-stage features

### Phase 1 — Trust, backup, and daily value

| Feature | User value | Complexity | Priority |
|---|---|---:|---|
| Optional sign-in and cloud backup | Restores data and syncs devices | High | P0 |
| Cross-device sync with offline outbox | Consistent Android, iOS, and web data | High | P0 |
| Account export and permanent deletion | Trust, portability, and compliance readiness | Medium | P0 |
| Better renewal notification controls | Reminder time, weekday rules, and quiet hours | Medium | P0 |
| Free-trial countdown and “cancel before” alert | Prevents surprise charges | Low | P0 |
| One-tap subscription duplication | Speeds up tracking similar recurring services | Low | P1 |
| Notes and billing reference field | Captures useful context without credentials | Low | P1 |
| App widget / quick action | Fast view of next renewal and monthly spend | Medium | P1 |

### Phase 2 — Better decisions and planning

| Feature | User value | Complexity | Priority |
|---|---|---:|---|
| Renewal calendar and timeline | Makes charge dates immediately visible | Medium | P1 |
| Monthly cash-flow forecast | Shows predicted recurring charges by week | Medium | P1 |
| Price-increase tracker | Alerts a user to a manually confirmed price change | Medium | P1 |
| Plan recommendation | Highlights lower-cost plans from the verified catalog | Medium | P1 |
| Savings scenarios | “What if I pause/cancel this plan?” budget impact | Low | P1 |
| Category spending targets | Budget guardrails for entertainment, AI, fitness, etc. | Medium | P1 |
| Annual renewal view | Prevents large once-a-year renewal surprises | Low | P1 |
| Multi-currency display | Supports travel and subscriptions billed in another currency | Medium | P2 |

### Phase 3 — Collaboration and power-user features

| Feature | User value | Complexity | Priority |
|---|---|---:|---|
| Household / family workspace | Shared subscriptions with member roles | High | P2 |
| Shared-cost split calculator | Clarifies contributions for family plans | Medium | P2 |
| CSV import and export | Faster onboarding from a spreadsheet | Medium | P2 |
| Receipt attachment | Keeps renewal evidence with the record | Medium | P2 |
| Smart category and duplicate suggestions | Reduces manual organization effort | Medium | P2 |
| Web dashboard with responsive desktop views | Enables review from a browser | Medium | P2 |
| Apple/Google calendar export | Surfaces renewal dates in existing workflows | Medium | P2 |

### Phase 4 — Only after explicit consent and strong privacy review

| Feature | Value | Guardrail |
|---|---|---|
| Read-only email receipt detection | Less manual data entry | Per-provider opt-in, narrow scopes, transparent import review, and revocable access |
| Open-banking transaction detection | Finds forgotten recurring charges | Separate product decision, explicit consent, regulated provider, no credential handling by SubTrack |
| Provider API integrations | May automate selected management actions | Integrate only documented official APIs and make every action user-confirmed |

## Features to avoid in the initial cloud launch

Do not add bank access, inbox access, direct cancellation, or advertising profiles before cloud backup and data ownership flows are reliable. These features create trust, compliance, and support burden that is disproportionate for the MVP.

## Recommended delivery sequence

| Release | Scope | Outcome |
|---|---|---|
| **1.1** | Supabase project, optional auth, `profiles`, `subscription_records`, `user_settings`, RLS, local migration | Safe cloud backup and restoration |
| **1.2** | Offline outbox, conflict policy, cross-device sync, account deletion/export | Reliable everyday cloud sync |
| **1.3** | Trial alerts, renewal timeline, savings scenarios, category targets | Stronger recurring-use value |
| **1.4** | Household workspace, CSV import, widgets, optional receipt attachments | Expansion for power users and families |

## Implementation recommendation

Choose **Supabase** for the cloud data layer and retain local-first operation. The first engineering milestone should be auth, RLS-protected subscription tables, and an explicit local-to-cloud migration—not a large feature bundle. This ensures that every later feature has a trustworthy user identity, secure storage, and a reliable synchronization foundation.

## References

[1]: https://supabase.com/docs/guides/auth "Supabase Auth"
[2]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"
[3]: https://firebase.google.com/docs/firestore "Cloud Firestore documentation"
