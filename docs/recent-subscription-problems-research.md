# Recent Subscription-Management Problem Research

## Evidence log

### 2026-08-20 — Reddit /r/SaaS: Subscription fatigue

Source: https://www.reddit.com/r/SaaS/comments/1qz7jj3/im_sick_of_renting_my_life_subscription_fatigue/

The post describes difficulty managing an increasing number of app and service subscriptions, framing the problem as cumulative mental load rather than one isolated charge. The page was captcha-blocked in-browser, so only the visible post text was used; no unextracted comments are treated as evidence.

### 2026-08-20 — Reddit /r/SaaS: Difficult cancellations and forgotten trials

Source: https://www.reddit.com/r/SaaS/comments/1u26lg0/whats_the_most_annoying_subscription_youve_ever/

Direct comments describe loss from forgotten free trials, retention flows with repeated screens and discount offers, and inconveniently early renewal notices for an annual SaaS subscription. Multiple commenters distinguish stopping a payment from ending a contractual subscription, which reinforces that a management app should provide clear reminders, decision support, and official-provider handoffs rather than claim to cancel or block services. The discussion also flags trust concerns around virtual cards and financial access.

## Provisional implications

- Treat **forgetting** as separate from cancellation friction; users may need a reminder and a decision prompt before they need a cancellation route.
- Include trial and annual-renewal lead times that users can set deliberately, with earlier review for annual commitments.
- Record a local cancellation follow-up state and launch the official provider page; do not imply that a charge block or an in-app status ended the underlying agreement.
- Preserve a local-first, no-financial-access model, because trust in payment-control tools is itself a concern in the discussion.

### 2026-08-20 — Figma Forum: unintended renewal and seat upgrade

Source: https://forum.figma.com/report-a-problem-6/refund-for-unintended-subscription-renewal-and-seat-upgrade-55130

A June 2026 user reports not using Figma for some time and being surprised by a renewal of $39.20 after having previously paid $5 per month. The provider response attributes the higher amount to an in-product seat upgrade approved when an edit was made. This illustrates a separate risk from simple renewal: plan or entitlement changes can alter the amount that renews, while a user no longer remembers the action that caused the change.

### 2026-08-20 — CHOICE Community: annual renewal without advance notice

Source: https://choice.community/t/britbox-no-warning-of-renewal-of-annual-subscription/31634

The original poster says an annual BritBox subscription renewed without a reminder email; the provider reportedly did not send pre-renewal reminders. Another participant reports surprise at a price increase from approximately $89.99 to $99.99 and a preference for a monthly plan that could be paused. This is direct evidence of annual-date visibility, amount-change visibility, and commitment-flexibility problems.

## Expanded provisional implications

- Surface a user-entered **expected renewal amount** beside the current saved amount and ask for confirmation whenever the user learns of a plan or price change.
- Offer an **annual commitment review** that begins well before the renewal date and records the user’s intended choice, such as keep annual, switch monthly, or cancel via the official provider page.
- Make the reason for any user-recorded cost change visible, for example “plan upgrade,” “price increase,” or “seat change,” so it is not mistaken for a renewal-date error.

### 2026-08-20 — Google Drive Community: cancelled but still charged

Source: https://support.google.com/drive/thread/350326248/cancelled-subscriptions-but-still-charged?hl=en

The original poster says they cancelled a Google One subscription but were charged again, could not see a cancellation status in the app or website, and tried removing payment methods while seeking a way to prevent the charge. The response explains that an authorization hold can appear a few days before a billing-cycle end, while later replies route the person through support. The thread has 312 “same question” signals on the page, but this should not be treated as a representative population measure. It does show that users need to distinguish a pending hold, a completed charge, a subscription’s current state, and a support/refund path.

### 2026-08-20 — Reddit /r/personalfinance: subscription price increases

Source: https://www.reddit.com/r/personalfinance/comments/1lndblx/reining_in_subscription_price_increases/

The page was blocked by Reddit’s network-security screen before substantive content could be read. Its search-result snippet is not used as evidence in this research.

## Further provisional implications

- Provide a clear local **cancellation evidence record**: when the user requested cancellation, where they did it, any confirmation reference they enter, the stated end date, and a next review date.
- Use explicit language for **scheduled renewal**, **pending payment**, **charged**, and **cancelled—confirmation needed**. A local app cannot determine provider state, but it can prevent users from conflating those states.
- Pair official-provider handoffs with a short support/refund note only after the user confirms that the provider’s cancellation path was attempted.

### 2026-08-20 — Google One Community: household owner stopped paying

Source: https://support.google.com/googleone/thread/378620152/family-member-manager-stopped-paying-premium?hl=en

The poster lost shared premium access when the family manager stopped paying and wanted to join another family immediately. The community answer says the provider’s 12-month family-switching restriction still applies. This shows that a shared plan can involve a dependency on one person’s payment and provider-specific eligibility constraints, not just a cost split.

### 2026-08-20 — Figma Forum: collaborators created unexpected paid seats

Source: https://forum.figma.com/report-a-problem-6/refund-request-and-billing-inquiry-unexpected-154-19-charge-56892

A user says that inviting collaborators was understood as file collaboration but resulted in five paid Full seats plus a billing adjustment, increasing the apparent monthly amount from roughly $40 to $154.19. The provider attributes the situation to paid edit-seat assignments and advises using free View seats or approval settings. This is a detailed example of shared-seat complexity causing both an unexpected amount and uncertainty about responsibility.

## Consolidated opportunity directions

| Observed problem | Privacy-first SubTrack response | Explicit limitation |
|---|---|---|
| A trial or annual renewal is forgotten | User-set review horizons, local reminders, and a keep/switch/cancel decision record | SubTrack does not cancel the provider service |
| Renewal amount changes after a plan or seat change | Store the latest user-entered amount, change reason, expected next amount, and review reminder | SubTrack cannot read provider invoices or detect changes automatically |
| Cancellation was attempted but a charge appears | Capture local cancellation evidence and state; open the official billing/support path | SubTrack cannot verify provider cancellation or reverse a payment |
| Household owner or payer changes | Show payer, members, contribution expectations, and a provider-constraint note | SubTrack cannot alter family-group eligibility or payment ownership |
| Collaborator or seat-count growth changes cost | Maintain local seat/count notes and cost-change context for shared subscriptions | SubTrack cannot manage provider seats or access settings |
