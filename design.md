# SubTrack MVP — Mobile Interface Design

## Product intent

SubTrack is a **privacy-first subscription dashboard** for people who want a simple picture of their recurring services without connecting a bank account or inbox. It helps users discover services, add their real subscriptions manually, understand upcoming renewals, compare plan options, and open the correct official management page.

The interface is designed for **portrait mobile screens (9:16)** and one-handed use. It combines iOS-native interaction patterns with a **Google-inspired Material clarity**: a calm white canvas, restrained one-pixel dividers, spacious 8-point rhythm, softly rounded 16–24 px surfaces, clear hierarchy, readable navigation, and direct action labels. The experience must feel simple rather than decorative.

## Brand and visual direction

The product should feel calm, competent, and financially responsible rather than aggressively “budgeting” focused. The redesigned language uses Google-style blue as the primary action color, a white/soft-gray canvas, subtle neutral outlines, and limited semantic feedback colors. **Poppins is the only typeface** used for all interface text, with Regular for supporting information, Medium for controls, SemiBold for labels, and Bold only for high-level numeric and page hierarchy.

| Role | Color | Usage |
|---|---|---|
| Ink | `#202124` | Primary titles, tab labels, high-confidence text |
| Canvas | `#F8F9FA` | Main screen background |
| Surface | `#FFFFFF` | Cards, sheets, input areas |
| Google Blue | `#1A73E8` | Primary actions, selected controls, active tab |
| Blue Tint | `#E8F0FE` | Selected filters and low-emphasis blue surfaces |
| Green | `#188038` | Positive status and active subscription state |
| Amber | `#F9AB00` | Upcoming renewal and trial alerts |
| Red | `#D93025` | Delete and destructive action states |
| Slate | `#5F6368` | Supporting copy and metadata |

## Redesign system

The dashboard uses a simple document-like layout rather than dark hero cards or decorative gradients. The key financial number sits in a white summary surface with a crisp blue indicator and supporting text beneath it. Every list item is a clean outlined surface with an identifiable service mark, two lines of text, and a direct value. Filter chips use a single selected blue-tint state; empty states remain quiet and helpful.

Navigation stays familiar and lightweight. Bottom navigation has plain iconography, a clear blue active label, and no extra visual chrome. Screens use short page titles, persistent search where relevant, large direct touch targets, and single-purpose primary buttons. Poppins weights are used intentionally so dense information remains highly scannable on a narrow portrait screen.

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
