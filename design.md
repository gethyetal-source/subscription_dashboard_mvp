# SubTrack MVP — Mobile Interface Design

## Product intent

SubTrack is a **privacy-first subscription dashboard** for people who want a simple picture of their recurring services without connecting a bank account or inbox. It helps users discover services, add their real subscriptions manually, understand upcoming renewals, compare plan options, and open the correct official management page.

The interface is designed for **portrait mobile screens (9:16)** and one-handed use. It follows mainstream iOS patterns: a clear large-title hierarchy, a familiar bottom tab bar, generous touch targets, grouped cards, modal sheets for focused tasks, visible back navigation, concise controls, and unobtrusive confirmation feedback.

## Brand and visual direction

The product should feel calm, competent, and financially responsible rather than aggressively “budgeting” focused. The visual language uses deep navy for trust, teal for active control and successful actions, pale mint for lightweight highlights, and warm amber for upcoming renewal attention.

| Role | Color | Usage |
|---|---|---|
| Ink | `#10253F` | Primary titles, tab labels, high-confidence text |
| Canvas | `#F7F9FC` | Main screen background |
| Surface | `#FFFFFF` | Cards, sheets, input areas |
| Teal | `#0E9F8A` | Primary action, active tab, confirmations |
| Mint | `#DDF6EE` | Savings and positive-status highlights |
| Amber | `#E59D2D` | Upcoming renewal and trial alerts |
| Coral | `#D45757` | Delete and destructive action states |
| Slate | `#667085` | Supporting copy and metadata |

## Screen list

| Screen | Primary content and functionality |
|---|---|
| Home dashboard | Monthly and annual spending estimate, upcoming renewal cards, trial alerts, quick add action, and a small insight about subscription coverage. |
| Discover catalog | Search, category chips, featured services, filter by category, and service cards that open a detail view. |
| Service detail | Service overview, plan cards, reference pricing, category, last-verified label, compare plans action, and “Add to my subscriptions.” |
| Compare plans | Side-by-side or segmented plan comparison of tier, billing cycle, indicative price, key benefits, and a recommended use-case label without making a financial recommendation. |
| My subscriptions | Active, trial, cancelled, and uncertain subscription lists; filters; spending totals; swipe-safe edit and archive actions. |
| Add/edit subscription sheet | Service, plan, price, billing cadence, next renewal, trial end, billing source, and user note fields with save validation. |
| Subscription detail | Personal record, spending estimate, renewal details, reminder setting, plan info, billing-source explanation, edit, mark-cancelled, and official-management action. |
| Official management sheet | A clear statement of who bills the user, what SubTrack can and cannot do, and a single action that opens an official provider, Apple, or Google destination. |
| Settings | Reminder defaults, data export placeholder, privacy explanation, catalog feedback entry point, and local-data reset control. |

## Key user flows

### Discover and add a subscription

1. The user opens **Discover** from the tab bar.
2. The user searches or selects a category such as AI or Entertainment.
3. The user opens a service card to inspect plan details and indicative price information.
4. The user taps **Add to my subscriptions**.
5. A sheet lets the user enter their actual plan, price, renewal date, and billing source.
6. On save, the app confirms that the record is stored locally and returns the user to the subscription detail.

### Monitor a renewal

1. The user opens **Home**.
2. The first card identifies the next upcoming charge or trial deadline.
3. The user taps the card to open the subscription detail.
4. The user adjusts the reminder or selects **Manage officially**.

### Reach the official management page

1. The user opens a subscription detail.
2. The user taps **Manage officially**.
3. The app shows the billing authority and explains that only that authority can cancel or change the subscription.
4. The user taps **Open official page**.
5. On return, the user may mark the record as active, cancelled, changed, or uncertain; the app never infers cancellation success.

### Compare plans before buying or changing

1. The user opens a service detail from Discover or an existing subscription.
2. The user taps **Compare plans**.
3. The user reviews tier-by-tier cards with indicative pricing and concise differences.
4. The user returns to add or edit their own actual subscription record.

## Interaction principles

All high-frequency actions are placed within thumb reach: the persistent tab bar, the floating add button on list-based screens, and the primary action at the bottom of detail screens. Forms use simple pickers and segmented controls rather than free-text wherever a bounded selection is available. Destructive actions require confirmation, and official-link actions explain the destination before leaving the app.

The MVP uses local storage. It does not request bank, inbox, or provider-password access; therefore onboarding can be lightweight and transparent.
