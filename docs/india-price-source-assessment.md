# India Catalog Price-Source Assessment

**Status:** Initial assessment for the weekly research report. This document records what an official public page exposes; it does not assert a user's actual billed amount.

## Evaluation rule

A source is eligible for the report only when it is provider-owned, publicly reachable without provider credentials, explicitly scoped to India or INR, and clear about the recurring price separate from temporary promotions. Every finding remains a **manual-review proposal**. It must never overwrite a local `SubscriptionRecord.amount`, expected next charge, billing channel, or cancellation evidence.

| Service | Official source reviewed | India / INR evidence | Report treatment | Reason |
| --- | --- | --- | --- | --- |
| ChatGPT | [ChatGPT Pricing](https://chatgpt.com/pricing/) | The public page presented a United States audience and USD values rather than an India-specific INR price. | **Context-required; no INR value proposed.** | A provider-owned page is available, but it is not an India-scoped consumer price source. The report may flag product-plan changes, but must ask for an India confirmation source before proposing a catalog price. |
| Spotify | [Spotify Premium India](https://www.spotify.com/in-en/premium/) | The `in-en` page publicly lists INR prices and identifies India. It distinguishes a two-month offer from the stated monthly renewal price. | **Reviewable India source.** | The report may propose changes to the recurring INR amount only after separating introductory promotions and eligibility-limited student pricing from the ordinary renewal price. |
| Apple Music | [Apple Music India](https://www.apple.com/in/apple-music/) | The India page publicly lists ₹139/month Individual, ₹229/month Family, and ₹69/month Student, as well as trial and verified-student restrictions. | **Reviewable India source.** | The recurring INR price is explicit, but new-subscriber promotions and eligibility must remain separate from the renewal value. |
| Google One | [Google One plans](https://one.google.com/about/plans?hl=en-IN) | The India-language page was reachable, but only the included 15 GB plan was publicly rendered; paid plan prices were not exposed. | **Context-required; no INR value proposed.** | The report can note accessible terms and a missing public paid-price table, but must not infer a paid price from another locale or a search result. |
| YouTube Premium | [YouTube Premium](https://www.youtube.com/premium) | The public page rendered USD values rather than INR and included trial, household, and student restrictions. | **Context-required; no INR value proposed.** | Public pricing is locale-dependent. The report must retain the source finding but cannot treat the displayed USD values as India pricing. |
| Microsoft 365 | [Microsoft 365 India](https://www.microsoft.com/en-in/microsoft-365/p/microsoft-365-personal/cfq7ttc0lchc) | The provider URL is India-scoped but did not expose readable plan content in the assessment request. | **Manual-only until a stable public India price table is verified.** | The report must record the failed/unreadable fetch and avoid inventing a price from the page title, checkout state, or third-party results. |

## Observed source caveats

The ChatGPT page displayed USD pricing for Free, Go, Plus, and Pro under an English/United States context. It therefore does not meet the India-price publication standard on its own. The Spotify India page displayed an offer of ₹139 for two months followed by ₹139 per month for Premium Standard, ₹299 per month for Premium Platinum, and a ₹69 two-month student offer followed by ₹69 per month for eligible students. Apple Music’s India page separately displayed ₹139/month Individual, ₹229/month Family, and ₹69/month Student, with a trial and verification conditions. These are provider-published reference values, not proof of a price for Apple, Google Play, carrier, reseller, or legacy-billed subscriptions.

Google One exposed India-language terms but no publicly rendered paid plan amount, while YouTube Premium rendered a USD page. Microsoft’s India product URL did not yield readable pricing content. These sources must be reported as unavailable or context-dependent, rather than silently filled with a converted or estimated INR value.

The next assessment pass will classify each remaining catalog provider as **reviewable India source**, **context-required**, **unavailable in India**, or **manual-only**. It will record a source URL, plan, recurring amount or scope note, currency, source type, fetch time, confidence, and reason for any review requirement.
