# Country and currency defaults

Settings → Country & currency selects a country or territory and its default billing currency. The choice is saved locally and included in backups and optional cloud snapshots.

New subscriptions, imports without a currency column, charge worksheets, and regional price worksheets use this currency. Explicit imported currencies and existing subscription currencies take precedence. Overview and Insights initially show the selected currency, including a real zero total when no subscriptions use it. Other currencies remain separately selectable.

Changing country does not convert or relabel subscription prices, savings, or an existing nonzero budget. A budget that has not been set adopts the new currency. Countries with multiple legal-tender currencies use one default; users can still enter the currency shown on their bill.

## Data provenance

The offline country/territory names and tender-currency history were adapted from [Unicode CLDR JSON](https://github.com/unicode-org/cldr-json), read on 2026-10-06:

- `cldr-core/supplemental/currencyData.json`
- `cldr-localenames-full/main/en/territories.json`

Currency periods are evaluated for 2026-10-06. The list excludes the European Union grouping and places without a current tender-currency entry. It includes CLDR territory identifiers, which should not be interpreted as a claim about sovereignty or an exhaustive ISO 3166 list.

Bulgaria uses EUR from 2026-01-01. Curaçao and Sint Maarten use XCG. Zimbabwe uses ZWG. Lesotho defaults to its national currency, LSL, rather than the also-accepted ZAR. These are billing defaults, not exchange-rate or provider-eligibility data.

CLDR data is covered by the [Unicode License V3](third-party/unicode-data-license.txt). Its complete notice also ships inside the app at Settings → About SubTrack → Country data license. No online country lookup or location permission is needed by the app.
