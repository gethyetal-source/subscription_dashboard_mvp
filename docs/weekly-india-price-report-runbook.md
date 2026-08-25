# Weekly India Catalog Price-Report Runbook

## Active cadence

The **Weekly India catalog price report** is active and runs every **Monday at 09:00 Asia/Calcutta**. Each run examines the current SubTrack catalog against provider-owned public sources and writes a new report to `docs/weekly-price-reports/india-YYYY-MM-DD.md`.

The run is intentionally a research and review workflow. It does not publish a price, edit `lib/catalog.ts`, or change any user data. This protects users whose actual billing differs because of their App Store or Google Play channel, taxes, promotions, eligibility, bundle, carrier, reseller, or historic-price cohort.

## Reviewing a weekly report

| Step | Reviewer action | Required check |
| --- | --- | --- |
| 1. Read the scope | Confirm the report says `India (IN)` and only treats INR as valid when the provider page published it. | Reject any converted, estimated, or non-India price. |
| 2. Open evidence | Open the cited provider-owned source for each proposed change. | Confirm the observed wording, plan name, cadence, and market scope. |
| 3. Separate conditions | Review trials, promotional offers, student pricing, household rules, seats, taxes, and billing-channel conditions. | Ensure an introductory or eligibility-limited figure is not labeled as the ordinary recurring amount. |
| 4. Decide the catalog action | Approve, defer, or reject the proposal. | A page blocked by account or locale context cannot support a numeric INR catalog update. |
| 5. Apply deliberately | Make a separate reviewed code change only for approved catalog-reference updates. | Preserve the catalog’s existing “reference price” guidance and do not touch user subscription records. |

## What the report records

Each service-plan observation has a provider source URL, market, currency when published, price type, exact official wording, cadence, fetch time, confidence, evidence, and review reason. Services without a suitable India price table are explicitly marked `context-required` or `manual-only`; they are not filled with guesses.

The policy and current baseline are maintained in [the report policy](./weekly-india-price-report-policy.md) and [the source assessment](./india-price-source-assessment.md). Those documents are the reference for future changes to scope, accepted source types, or review requirements.

## Boundary for personal records

> A catalog report is not a bill, a renewal notice, or proof of an account’s current charge. SubTrack keeps local subscription amounts, expected charges, payment-source notes, renewal dates, and cancellation evidence under the user’s control. None of these are read or modified by the weekly report.
