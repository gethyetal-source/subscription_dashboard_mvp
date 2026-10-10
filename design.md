# SubTrack interface

## Direction

The primary job is to understand recurring spending and avoid unwanted renewals. The user selected a light, premium consumer-finance direction and supplied emerald finance/wellbeing references. The design uses those references for hierarchy, spacing, and color, not for bank-account functionality.

This is a reference-informed design hypothesis, not a claim of completed user research.

## Visual system

- Emerald primary `#087F65`, pale canvas `#F7FAF9`, white surfaces, ink `#142B25`.
- Supporting text `#5B7067`; warning and destructive colors only for meaningful states.
- Dark mode keeps the same hierarchy with a deep green canvas and mint actions.
- Poppins Regular, Medium, SemiBold, and Bold. Bold is reserved for page hierarchy and key amounts.
- Rounded 14 px inputs/actions, 18–24 px surfaces, restrained outlines, and 44–48 px touch targets. Seven-column calendar cells are narrower on small phones.
- Centered web content, maximum width 760 px; sheets maximum width 480 px.

## Navigation and hierarchy

Three tabs: **Overview**, **Subscriptions**, and **Insights**. Settings is a header action. Service discovery and import are part of Add, not primary tabs. Existing secondary URLs remain accessible.

### Overview

1. Compact header with Settings and, for existing records, Add.
2. Emerald monthly-equivalent summary with a currency selector and amount-visibility control.
3. Subordinate remaining-this-month payment forecast and budget remaining, or yearly equivalent.
4. One deadline-ranked attention item with access to the complete queue.
5. Date-grouped upcoming payments, without separate “next” and “more” renewal cards.

The empty state has one working Add action, not empty charts or disabled summary cards.

### Subscriptions

Search and Current/Trials/Archived filters sit above a scannable ledger. Each row opens details. Price/date edits, full edits, and removal sit in the row overflow. Current records include uncertain plans; archived records stay outside the default list. Rows are ordered by the projected payment or trial deadline, not a stale original billing date.

Charge recognition and the billing-reference index are secondary ledger actions.

### Add and edit

Add starts with service search, popular shortcuts, a custom-service option, and import. The detail form asks for the name, actual price, currency, cadence, and next payment or trial date. Catalog prices never silently become the user's actual price.

Billing source, price expectations, auto-renew, notes, cost sharing, and cancellation evidence are progressively disclosed. Known and custom plans use the same form. Free amounts and dates including today are valid. Editing an archived plan does not silently reactivate it.

### Details and renewal review

Show the plan price and deadline first, followed by the relevant renewal review or pending-cancellation action. Provider management is an explicit handoff with confirmation. Recording a decision never changes a provider account.

Reminders, plan comparisons, regional quotes, household shares, notes, and history remain available in context. Cancellation confirmation is a separate, explicit action after the user checks the provider's outcome.

### Insights and Settings

Insights is a per-currency report: monthly equivalent, category allocation, forecast, review candidates, price changes, budget position, and manually recorded savings. Savings entry and history open in sheets, rather than remaining forms inside the report.

Settings contains a searchable country/currency selector, focused budget editor, appearance, Android reminders, privacy, backup/calendar export, household access, optional cloud accounts, and reset. Product strategy and deployment instructions do not belong in the interface.

## Launch experience

Native splash and the React launch screen use the same emerald mark and background. The savings tagline is:

**Spend on what matters. Save the rest.**

The mark enters softly with a restrained pulse on every fresh app launch. Its 1,600 ms visible introduction starts only after fonts finish or fail, the launch view lays out, and the static native splash has been hidden. Two paint frames precede the animation clock. The native splash itself has no fade that could cover the introduction. Reduced motion removes the intro wait and entrance/pulse/fade animations.

The overlay waits for font completion (or a font error), local data readiness (or a recoverable storage error), and privacy readiness. Underlying screens are hidden while the overlay is visible. A locked app still requires device authentication; a privacy read failure offers Retry rather than displaying records.

## Financial and privacy boundaries

- Never combine or convert different currencies. Prefer the chosen country's currency, including an honest zero total if no records use it. Without a country choice, preserve the existing budget-currency preference when it is present in active records.
- Country changes set defaults for new entries, not existing prices. Existing nonzero budgets keep their own currency; an unset budget adopts the chosen currency.
- Monthly/yearly equivalents are estimates, not charges already paid. Remaining-month totals use actual projected billing dates.
- Attention is ordered by decision deadline. Overdue trial checks and cancellation follow-ups on archived records remain visible.
- Amounts, renewal settings, usage check-ins, and provider outcomes come from user records. No bank, inbox, or provider account is monitored.
- Savings are manually recorded refunds or avoided charges, not automatically claimed benefits.
- Preserve queued, validated local storage, recovery snapshots, cloud conflict protection, and reminder behavior.
- Hide amounts protects formatted summaries, not editable forms, notes, receipts, shared-plan fields, or exports. Storage and exported backups are not encrypted.

## Validation

Run `pnpm check`, `pnpm test`, `pnpm lint`, web export, and Android bundle export. Test empty/populated, mixed-currency, trial, archived, overdue follow-up, malformed input, reduced-motion, and storage-error states. Check narrow phones, a normal phone, and desktop in both themes.

An exported JavaScript bundle is not an installed APK. Android notifications, authentication, widget refresh, and native OCR still require physical-device checks.
