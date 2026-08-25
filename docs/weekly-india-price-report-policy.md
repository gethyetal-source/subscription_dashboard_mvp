# Weekly India Catalog Price-Change Report Policy

**Owner:** SubTrack catalog team  
**Scope:** India (`IN`) as the primary market; INR where an official source explicitly publishes it.  
**Publication model:** Research report only. Every suggested catalog change requires a separate human decision and a reviewed code update.

## Purpose and safety boundary

This workflow observes provider-owned public sources once each week and produces an auditable change report. It is designed to improve catalog references, not to determine what any person owes. A provider price can depend on the purchase channel, tax treatment, account history, a promotional offer, student or household eligibility, seat count, or a preserved legacy price. Apple and Google both document country- or region-specific subscription pricing and historic-price behavior for existing subscribers.[1] [2]

> **Non-negotiable boundary:** The workflow must never edit a user’s local subscription amount, expected next charge, billing source, renewal date, payment evidence, or cancellation record. It must never sign in to a provider, access an App Store or Google Play account, use a user’s billing credentials, or complete a purchase or cancellation.

## Eligible sources and decision statuses

| Status | When it applies | How it appears in the weekly report | Catalog action |
| --- | --- | --- | --- |
| `reviewable-india-source` | A provider-owned public page clearly identifies India or INR and states an ordinary recurring price. | Proposed change, including source evidence and caveats. | Human review before any edit. |
| `promotion-or-eligibility-limited` | A trial, introductory price, student offer, household condition, seat price, or time-limited benefit is present. | Recorded separately from the recurring price. | Do not replace a recurring reference with the offer. |
| `context-required` | The official page is provider-owned but displays a different locale/currency or requires a location/account context for India. | No INR price proposed; explain what was observed. | Retain or replace the catalog label with transparent guidance only after review. |
| `manual-only` | An official India source is unreadable, gated, dynamically rendered without a verifiable public price, or the service is unavailable in India. | Failed/blocked source entry with timestamp and URL. | No numeric price update. |
| `no-change-confirmed` | The previously approved India reference is still present in a suitable official source. | Source recheck with timestamp. | No edit. |

## Required record for each observation

Every entry in a weekly report must include the following fields. A missing field makes the entry `manual-only` rather than an automatic conclusion.

| Field | Required content |
| --- | --- |
| `serviceId` and `planId` | Existing identifiers from `lib/catalog.ts`, or a stated proposed new identifier. |
| `provider`, `planName`, and `sourceUrl` | The provider-owned brand, human-readable plan name, and exact public page reviewed. |
| `market` and `currency` | `IN`; `INR` only when the source explicitly exposes it. Never convert another currency. |
| `sourceType` | `official-static-page`, `official-locale-page`, `official-store-page`, `official-api`, or `manual`. |
| `priceKind` | `recurring`, `introductory`, `annual-nonrenewing`, `seat-based`, `bundle`, `included`, `variable`, or `unavailable`. |
| `observedPrice` and `billingCadence` | Exact publisher wording and cadence. Retain tax, trial, and eligibility language; do not normalize ambiguous text into a number. |
| `fetchedAt`, `confidence`, and `status` | ISO timestamp, `high`/`medium`/`low`, and one policy status above. |
| `evidence` and `reviewReason` | Short quotation or concise page observation plus why human review is needed or not needed. |

## Report structure and manual-update flow

The scheduled task writes one Markdown report per run under `docs/weekly-price-reports/` using an ISO date in the filename. The report must start with the run time, catalog version inspected, market scope, services checked, services blocked, and a statement that it does not change personal records. It must then group results into confirmed recurring-reference changes, new/removed plans, promotions and eligibility notes, context-required sources, inaccessible sources, and no-change checks.

For every proposed price change, the report must show the earlier catalog label, the exact observed official wording, the source URL, the evidence, and a recommended manual action. A human reviewer must check the source before changing `lib/catalog.ts`. If approved, the code change must retain the current regional/reference guidance and must not modify user-created subscription records.

## Review rules

The task checks the current 23-service catalog only. It must favor official pages linked in the catalog, then provider-owned India pages discovered through official navigation. It must not use search snippets, blogs, aggregators, forum posts, social posts, or currency conversions as price evidence. It must not bypass authentication, CAPTCHAs, geo-restrictions, or bot protections.

If a page lists an offer such as “first month free” or “two months for ₹X,” the report must record it as an offer and separately capture the post-offer renewal price only when the official page states it. Student, family, seat-based, carrier, reseller, Apple App Store, and Google Play prices must retain their conditions. Existing catalog labels remain reference data until a reviewer manually accepts a specific change.

## Initial source baseline

The supporting [India source assessment](./india-price-source-assessment.md) records the first official observations for ChatGPT, Spotify, Apple Music, Google One, YouTube Premium, and Microsoft 365. It demonstrates why an official provider URL is necessary but not sufficient for an India INR catalog entry.

## References

[1]: https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions/ "Apple: Manage pricing for auto-renewable subscriptions"
[2]: https://support.google.com/googleplay/android-developer/answer/12154973?hl=en "Google Play: Understanding subscriptions"
