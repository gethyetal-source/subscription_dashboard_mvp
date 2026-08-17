# SubTrack: User-Centered Feature Catalogue

## Current product direction

**Cloud database work is on hold.** The next stage should strengthen SubTrack’s value as a private, local-first subscription companion: a person should be able to understand what they pay for, avoid surprise charges, and make better keep/pause/cancel decisions without linking a bank account, inbox, or provider password.

> A useful subscription app answers four questions quickly: **What am I paying? What is due next? Do I still need it? What should I do now?**

## What SubTrack already helps a user do

| User need | Current SubTrack capability |
|---|---|
| “Show me all my subscriptions.” | Manual subscription tracking with service, plan, amount, billing source, and status. |
| “Tell me what I spend.” | Monthly and annual totals, category breakdowns, insights, budget progress, and projected trend. |
| “Help me avoid surprises.” | Renewal dates, trial dates, local reminders, and renewal indicators. |
| “Help me manage a service.” | Official management-page handoff, plan comparison, service discovery, and billing-source guidance. |
| “Help me find something quickly.” | Provider/plan search, category filters, sorting, and quick editing. |
| “Keep this private.” | Local device storage by default, without bank, inbox, or provider-password access. |

## Highest-value next features

### 1. Never miss a renewal or free-trial deadline

| User says | Helpful feature | Why it matters | Priority |
|---|---|---|---|
| “Warn me before my trial turns into a paid plan.” | **Trial countdown card** with “Ends in 3 days” and a direct official-management link | Prevents avoidable surprise charges | P0 |
| “Remind me at the right moment, not just on the billing date.” | **Flexible reminders**: 30/14/7/3/1 days before, morning/evening choice, quiet hours | Matches different planning styles | P0 |
| “Which charges are coming up this week?” | **Upcoming charges timeline** grouped by Today, This Week, and This Month | Gives an immediate action list | P0 |
| “I am travelling or busy; make it easier to notice renewals.” | **Calendar view** with charge markers and an agenda list | Makes timing visual | P1 |
| “I paused the service—do not keep warning me.” | **Pause/skip cycle** with a return date | Keeps reminders relevant | P1 |

### 2. Make spending understandable and actionable

| User says | Helpful feature | Why it matters | Priority |
|---|---|---|---|
| “Which subscriptions are costing me the most?” | **Top-cost list** with monthly-normalized cost | Focuses attention on the biggest savings opportunities | P0 |
| “Can I afford all these renewals this month?” | **Monthly charge calendar and cash-flow forecast** | Shows timing, not only annual totals | P0 |
| “I spend too much on entertainment.” | **Category budgets** with warnings and suggested actions | Turns a high-level budget into a practical decision | P1 |
| “What happens if I cancel or pause this?” | **Savings simulator** for one or multiple subscriptions | Makes the impact of a decision clear before acting | P0 |
| “Should I pay yearly instead?” | **Annual-versus-monthly calculator** | Highlights an estimated saving and next decision date | P1 |
| “Did a plan become more expensive?” | **Price-change history** with a user-confirmed old/new amount | Helps users notice silent price increases | P1 |

### 3. Make record keeping almost effortless

| User says | Helpful feature | Why it matters | Priority |
|---|---|---|---|
| “Add this service quickly.” | **Quick add templates** for common services with the correct plan, cadence, and official link prefilled | Reduces data-entry friction | P0 |
| “My service is not in the catalogue.” | **Custom subscription form** with user-provided logo color, category, and management URL | Keeps the app useful beyond its catalogue | P0 |
| “I just need to change the price or date.” | **Quick edit** for amount, renewal date, and reminder | Supports the most frequent maintenance task | Already available |
| “I have several similar subscriptions.” | **Duplicate subscription** action that copies fields but resets the dates | Saves repetitive work | P1 |
| “I want to remember why I have this.” | **Private notes** for household context, offer end dates, or account hints | Preserves context without storing credentials | P1 |
| “My receipt has the information already.” | **Manual receipt attachment or image note** stored locally | Lets users keep evidence beside the record | P2 |

### 4. Help users decide whether a subscription is worth keeping

| User says | Helpful feature | Why it matters | Priority |
|---|---|---|---|
| “I forgot why I subscribed.” | **Keep / review / cancel-later status** and a review date | Converts passive records into intentional decisions | P0 |
| “I have not used this in months.” | **Personal review prompts** based on a user-selected review interval, not surveillance | Helps users reassess spend without accessing private activity data | P1 |
| “Is there a cheaper plan?” | **Plan comparison with recommendation badges** such as “lowest individual plan” or “annual plan saves money” | Makes catalog information immediately useful | P1 |
| “Do I have duplicates?” | **Duplicate-category nudge** such as two music or cloud plans | Encourages a review without deciding for the user | P1 |
| “I need a simple answer.” | **Subscription health score** based on cost, renewal proximity, trial status, and user-set review date | Gives a clear attention queue | P2 |

### 5. Make discovery useful, not distracting

| User says | Helpful feature | Why it matters | Priority |
|---|---|---|---|
| “Which services could I track here?” | **Expanded curated catalogue** with clear categories and verified price labels | Improves onboarding and discovery | P1 |
| “What else is similar?” | **Alternative service suggestions** in the same category | Supports switching research | P2 |
| “I am in a different country.” | **Country and currency selector** for price display | Prevents confusing price assumptions | P2 |
| “Tell the team this catalogue item is wrong.” | **Catalog feedback** with price/source correction request | Keeps the catalogue more accurate | Already available |

### 6. Give users better views for different moments

| User moment | Helpful view | Priority |
|---|---|---|
| A quick morning check | **Today / next 7 days** dashboard card | P0 |
| Monthly budget review | **Spend by category and category-budget view** | P1 |
| Annual planning | **Annual renewal map** that groups one-time annual charges by month | P1 |
| Cleaning up subscriptions | **Review queue** filtered to trials, expensive plans, and services due soon | P0 |
| Looking for one record | **Global search** across provider, plan, category, notes, and billing source | P1 |
| Comparing changes over time | **Month-over-month total and category trend** | Already available |

### 7. Strengthen privacy, control, and trust

| User says | Helpful feature | Why it matters | Priority |
|---|---|---|---|
| “Do not ask for my bank account.” | **Privacy-first onboarding** that clearly explains manual tracking and local storage | Builds trust at the first interaction | P0 |
| “Let me take my data with me.” | **Structured local export** in JSON and CSV | Provides ownership and portability | P0 |
| “I want a backup without an account.” | **Encrypted local backup file** with user-controlled export/import | Adds resilience while cloud sync remains paused | P1 |
| “Protect this information if someone uses my phone.” | **Optional biometric app lock** | Adds privacy for a personal finance-adjacent tool | P1 |
| “Let me remove everything.” | **Clear local reset and delete confirmation** | Supports control and safe cleanup | Already available |
| “Explain what the app can and cannot do.” | **Plain-language privacy center** and permissions summary | Prevents misunderstanding about provider control | P1 |

### 8. Reduce friction on mobile

| User says | Helpful feature | Why it matters | Priority |
|---|---|---|---|
| “I need the next renewal without opening the app.” | **Home-screen widget** for next charge and monthly spend | Makes the product a daily utility | P1 |
| “I am already using my calendar.” | **Calendar export** for selected renewal dates | Fits existing routines | P1 |
| “I want to add a service while I remember it.” | **Share-sheet quick add** that accepts a copied service URL | Captures intent in the moment | P2 |
| “This needs to be easy to read.” | **Accessibility controls** for text size, contrast, screen-reader labels, and reduced motion | Makes core information usable for more people | P0 |
| “Do not make me type dates.” | **Calendar picker and smart date defaults** | Prevents form errors | Already available |

### 9. Useful power-user capabilities for later

| Feature | User value | Priority |
|---|---|---|
| CSV import | Move an existing spreadsheet into SubTrack | P2 |
| Bulk actions | Change category, status, reminder, or review date for multiple subscriptions | P2 |
| Multiple profiles on one device | Separate personal and work subscriptions locally | P2 |
| Household sharing | Coordinate family plans and shared costs | Deferred until cloud sync is approved |
| Shared-cost splitter | Calculate each member’s share of family plans | P2 |
| Recurring expense comparison | Compare subscriptions with manually tracked utilities or memberships | P3 |
| Read-only email or bank detection | Reduce manual entry | Deferred; requires explicit consent, privacy review, and a separate product decision |

## Recommended product sequence while cloud sync is paused

| Release | Focus | Features |
|---|---|---|
| **1.1 — Avoid surprises** | Renewal confidence | Trial countdown, flexible reminders, upcoming timeline, review queue |
| **1.2 — Save money** | Better decisions | Savings simulator, top-cost actions, category budgets, annual/monthly calculator |
| **1.3 — Reduce effort** | Faster maintenance | Quick templates, custom services, duplicate record, private notes, CSV export/import |
| **1.4 — Everyday utility** | Mobile convenience and trust | Widget, calendar export, biometric lock, encrypted local backup, accessibility controls |

## The most useful first five additions

1. **Trial countdown with “cancel before” reminders** so users avoid accidental paid renewals.
2. **Upcoming charges timeline** so users can immediately see what is due next.
3. **Savings simulator** so cancelling or pausing a plan has a visible monthly and annual impact.
4. **Subscription review queue** so users know which plans deserve attention now.
5. **Custom subscription templates and private notes** so tracking stays fast even for services outside the catalogue.

## What remains paused

No cloud database, account sign-in, cross-device synchronization, household sharing, or data migration work will be started until the product direction is explicitly approved. All recommended near-term features above can be built without changing SubTrack’s current local-first data model.
