# SubTrack: Research-Backed Feature Catalogue

**Research date:** 25 August 2026  
**Scope:** Research only. This catalogue does not change the app.

## Executive Recommendation

The strongest product opportunity is not automatic cancellation or financial-account aggregation. It is helping a person make a **better decision before the next charge**: what this subscription is for, whether it is still valuable, what amount is expected, who owns the billing relationship, what action is possible, and what evidence to retain. Recent discussions repeatedly describe fatigue, short or missed decision windows, surprise price changes, billing-path ambiguity, household ownership dependencies, and unreliable reliance on provider email notices.[1] [2] [3] [4] [5] [6] [7] [8]

> **Product principle:** SubTrack should create clarity, memory support, and an auditable next action—without reading a bank account, inbox, provider account, or password.

The highest-value roadmap is therefore a **Subscription Decision System**: concise pre-renewal decision plans, local value check-ins, local price and plan-change context, billing-owner reminders, and official-provider handoffs. The existing expected-charge, cancellation-evidence, reminder, household, and billing-source foundations make this path practical.

## What the Research Indicates

| Recurring user problem | Evidence from firsthand discussions | Local-first product response |
|---|---|---|
| Subscription fatigue and forgotten value | People describe a growing number of services, difficulty remembering what each does, and a desire for a manual tracker that does not require bank access.[1] | Self-reported value and use check-ins, decision queues, and an intentional review cadence. |
| Price-change decision pressure | Long-standing users describe annual price increases, short notice, and uncertainty about alternatives or migration time.[3] | Expected-charge history, a price-change journal, decision-window reminders, and an alternatives shortlist. |
| Missed trial-to-paid transitions | A recent discussion describes a short trial rolling into an annual charge despite the customer believing it was cancelled.[5] | Trial decision plans, advance review prompts, and an explicit local keep/pause/cancel-officially choice. |
| Unclear billing or cancellation route | Users seek help locating the correct cancellation path, while a separate charge-recognition thread points users through multiple platform histories and support routes.[2] [6] | Billing-source triage, a recognition worksheet, official links, and a local cancellation evidence trail. |
| Household-plan dependency | A family-plan owner describes payment trouble, a replacement plan, membership transfer questions, and eligibility uncertainty.[4] | Household role records, owner contact reminders, member-transition checklists, and clear local responsibilities. |
| Renewal notice gaps | A user reports missing a provider renewal notice despite expecting one; other plan discussions show that action and billing timing can differ.[7] [8] | Multi-stage device reminders, reminder-test status, plan-change timing notes, and user-recorded outcomes. |

## Prioritized Feature Catalogue

The priorities below balance **user value**, **implementation effort**, and **privacy or trust risk**. “Extend” means SubTrack already has an enabling foundation; “new” means a distinct experience is still needed.

### P0 — Next Best Build: Decision Support Before Renewal

| Feature | Status | User value | Effort | Privacy / trust notes | Why it matters |
|---|---|---:|---:|---|---|
| **Renewal decision plan** | New | High | Medium | Low | A compact card for each upcoming renewal: keep, downgrade, pause if available, cancel officially, or review later. It gives every charge a clear next action. |
| **Self-reported value check-in** | New | High | Small | Low | Ask “Used recently?”, “Would you buy this again today?”, and “What is it for?” at a user-chosen cadence. It addresses forgotten value without device or account tracking.[1] |
| **Trial-to-paid decision plan** | Extend trial tools | High | Small | Low | Store the expected paid amount, deadline, decision status, and official action link before a trial converts.[5] |
| **Subscription intent tags** | New | High | Small | Low | Tags such as essential, seasonal, work, learning goal, family, backup, and “testing.” Intent makes later keep/cancel decisions faster. |
| **Review cadence** | New | High | Small | Low | Let users choose monthly, quarterly, annual, or “before every renewal” reviews; surface a focused review queue rather than a long subscription list. |
| **Expected-vs-actual reconciliation** | Extend expected-charge fields | High | Medium | Low | After renewal, let a user record “matched,” “higher,” “lower,” or “unknown,” then preserve the reason. This creates a useful local price history. |
| **Price-change journal** | Extend expected-charge fields | High | Medium | Low | Show change history and the user’s reason—promotion ended, tax, plan change, seats, regional price, or unknown—without claiming live provider pricing.[3] |
| **Plan-change decision window** | New | High | Medium | Low | Record a provider’s downgrade or seat-change deadline, whether access changes immediately, and whether billing changes at renewal.[8] |
| **Pause-versus-cancel guide** | New | Medium | Small | Low | A per-subscription decision note explaining that pause availability must be checked at the official provider, with a local follow-up date. |
| **Renewal decision history** | New | Medium | Medium | Low | Keep a local timeline of prior “keep,” “downgrade,” “pause,” and “cancel officially” decisions so patterns are visible next year. |

### P1 — Build Next: Recognition, Ownership, and Recovery Context

| Feature | Status | User value | Effort | Privacy / trust notes | Why it matters |
|---|---|---:|---:|---|---|
| **Charge-recognition worksheet** | Extend billing identity | High | Medium | Low | Guided local fields for merchant label, payment rail, date range, amount, account alias, and official platform path. It supports user investigation without reading statements.[6] |
| **Billing-owner map** | Extend household and billing source | High | Medium | Low | Show who pays, which account/store owns the plan, who uses it, and who needs to act. This is especially useful for family plans.[4] |
| **Household transition checklist** | New | Medium | Medium | Low | Help a household record member moves, replacement plan creation, eligibility dates, plan-owner contact, and a follow-up task—without changing memberships. |
| **Alternative shortlist** | New | High | Medium | Low | Users can compare personally selected alternatives on price type, renewal cadence, migration effort, and decision date. No affiliate ranking or live-price claim is required.[3] |
| **Switch/migration checklist** | New | Medium | Medium | Low | Store export, billing, account, data-transfer, and confirmation steps for a user’s chosen replacement. Useful for products such as password managers or cloud services. |
| **Cancellation evidence export** | Extend evidence timeline | Medium | Medium | Low | Export a user’s local timeline, confirmation reference, and notes as a shareable text file. Clearly label it as a personal record, not provider proof. |
| **Support-path card** | New | Medium | Small | Low | When a charge is not recognized, present the appropriate official support, order history, subscription settings, or unauthorized-charge route based on a user-selected billing source.[6] |
| **Local receipt/reference vault** | New | Medium | Large | Medium | Allow optional on-device links or notes to a receipt/reference. Keep it encrypted or avoid sensitive attachments until a careful security design is approved. |
| **Decision buddy reminder** | New | Medium | Small | Low | With explicit user action, share a renewal decision reminder with a household member via the operating system’s share sheet; never access contacts automatically. |
| **Subscription ownership handoff** | New | Medium | Medium | Low | A guide for documenting who should manage a service after a family or work-role change, with official-account caveats. |

### P2 — Strong Differentiators After the Core Decision System

| Feature | Status | User value | Effort | Privacy / trust notes | Why it matters |
|---|---|---:|---:|---|---|
| **Seasonal subscription mode** | New | Medium | Small | Low | Mark a service as seasonal, choose the return month, and create a local restart/review reminder. |
| **No-buy / new-subscription cooling period** | New | Medium | Small | Low | After adding a new service, schedule a “still worth it?” review rather than locking or judging the purchase. |
| **Category envelopes** | Extend budget | Medium | Medium | Low | Set soft monthly or annual guidance by category (streaming, AI, cloud, learning) and review context instead of hard financial advice. |
| **Household fairness view** | Extend allocations | Medium | Medium | Low | Show local contributions, benefit owners, and review dates separately by currency, preserving the existing no-silent-conversion safeguard. |
| **Service dependency map** | New | Medium | Medium | Low | Record what breaks if a service is cancelled: shared storage, domain email, family access, or work workflows. This prevents impulsive cancellation. |
| **Contract and commitment tracker** | New | Medium | Medium | Low | Record minimum term, cancellation deadline, renewal term, and local reference to terms. Do not interpret the contract as legal advice. |
| **Personal renewal calendar export** | Extend calendar export | Medium | Small | Low | Add decision dates and plan-change deadlines alongside renewal dates, with a privacy note that calendar access is optional. |
| **Manual price-source log** | New | Medium | Small | Low | Let a user note where a price came from—provider page, app store, receipt, or email—and when they checked it. |
| **User-selected FX review mode** | Extend currency safeguards | Medium | Large | Medium | If users explicitly select a trusted exchange-rate source and date, show an estimated comparison separately from native-currency totals. Never silently convert. |
| **Annual-renewal preparation packet** | Extend Control Center | Medium | Medium | Low | Combine expected charge, stored price reason, billing source, official link, plan-change deadline, and a decision record for large annual renewals. |

### P3 — Optional, Strategic, or Requires a Higher Product Bar

| Feature | Status | User value | Effort | Privacy / trust notes | Recommendation |
|---|---|---:|---:|---|---|
| **Optional encrypted local backup/restore** | Deferred by prior product decision | Medium | Large | High | Needs careful encryption, recovery, and data-loss design. | Revisit only after core decision flows are validated. |
| **Selective receipt attachment** | New | Medium | Large | High | Raises sensitive-data and encryption requirements. | Defer; support a text reference first. |
| **Provider partnership integrations** | New | High | Very large | High | Could eventually verify plan state or enable deep actions, but needs contractual APIs and clear consent. | Explore only as an opt-in partnership track. |
| **User-authorized email import** | New | Medium | Large | High | Broadens sensitive-data scope and may undermine the privacy-first promise. | Do not prioritize. |
| **Bank aggregation** | New | High | Very large | High | Requires financial-data permissions, security, and regulatory diligence. | Do not add to the core product. |
| **Automated cancellation** | New | High | Very large | High | Cannot be reliable without provider access and may create harmful false-completion claims. | Keep official handoffs and local evidence instead. |

## Recommended Delivery Sequence

| Milestone | Features | Outcome |
|---|---|---|
| **1. Renewal Decision System** | Renewal decision plan, self-reported value check-in, trial-to-paid plan, intent tags, review cadence | Users see a small set of meaningful decisions before charges happen. |
| **2. Price and Plan Change Clarity** | Reconciliation, price-change journal, plan-change decision window, pause-versus-cancel guide | Users understand why an amount may change and what timing constraints matter. |
| **3. Ownership and Recognition** | Charge-recognition worksheet, billing-owner map, household transition checklist, support-path cards | Users know who pays, where to manage, and how to investigate a charge. |
| **4. Switch and Evidence Toolkit** | Alternatives shortlist, migration checklist, cancellation-evidence export | Users can leave or change a service with a clear, local record of what they did. |

## Features That Should Not Be Misrepresented

SubTrack should not say it has found every subscription, verified a charge, confirmed a provider cancellation, prevented a renewal, accessed a receipt, or compared live prices unless the user explicitly supplies the relevant information or a future, separately consented integration genuinely provides it. The app’s differentiator is a **trusted manual system of record**, not opaque automation.

## References

[1]: https://www.reddit.com/r/SaaS/comments/1qz7jj3/im_sick_of_renting_my_life_subscription_fatigue/ "Reddit: Subscription fatigue discussion"
[2]: https://forum.figma.com/ask-the-community-7/how-do-i-cancel-my-monthly-subscription-48771 "Figma Forum: How do I cancel my monthly subscription?"
[3]: https://www.1password.community/1password-at-home-31/what-justifies-the-huge-subscription-price-increase-24103 "1Password Community: What justifies the huge subscription price increase?"
[4]: https://community.spotify.com/t5/Premium-Family/Premium-Family-Payment-Issue-A-New-Family-Was-Created-Instead-of/td-p/7154363 "Spotify Community: Premium Family payment issue"
[5]: https://www.reddit.com/r/FlutterDev/comments/1vex9d1/how_do_you_handle_i_forgot_to_cancel_my_free/ "Reddit: Forgot to cancel free-trial discussion"
[6]: https://support.google.com/googleplay/thread/449379268/unknown-google-charge-unable-to-find-the-purchase-or-subscription-requesting-help-to-identify-the?hl=en "Google Play Community: Unknown Google charge"
[7]: https://community.adobe.com/questions-6/no-reminder-on-renewal-1556394 "Adobe Community: No reminder on renewal?"
[8]: https://forum.figma.com/ask-the-community-7/annual-billing-change-and-downgrade-seats-52717 "Figma Forum: Annual billing change and downgrade seats"
