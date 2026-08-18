# Project TODO

- [x] Create local subscription, service, plan, and billing-source data models
- [x] Build a locally persisted subscription store with starter catalog data
- [x] Replace the starter tab structure with Home, Discover, My Subscriptions, and Settings
- [x] Implement the Home dashboard with spending summaries and renewal alerts
- [x] Implement searchable category-based service discovery
- [x] Implement service details and plan comparison
- [x] Implement add, edit, archive, and delete subscription records
- [x] Implement subscription detail with billing-source guidance and official-link handoff
- [x] Implement local renewal reminder scheduling and preference controls
- [x] Add local data export and reset controls
- [x] Add catalog issue-report feedback flow
- [x] Design responsive iOS-style portrait layouts with accessible touch targets
- [x] Generate and apply the SubTrack app icon across required app assets
- [x] Update app configuration with final brand details
- [x] Add unit tests for spending calculations, persistence, and billing-link resolution
- [x] Validate core behavior through automated tests and TypeScript checks; browser preview testing is intentionally skipped for this mobile project
- [x] Create a final project checkpoint
- [x] Redesign the interface with a clean Google-inspired mobile visual system
- [x] Apply Poppins as the sole app typeface across the mobile MVP
- [x] Simplify layout density, elevation, navigation, cards, and action states across every screen
- [x] Validate the Google-inspired visual refactor through TypeScript and automated tests
- [x] Create a redesign checkpoint
- [x] Fix preview startup loop that leaves the project marked as under modification
- [x] Verify the stable Expo preview remains running after initial bundling
- [x] Add a visual renewal calendar to the dashboard with date-linked upcoming charges
- [x] Validate the renewal calendar with automated tests and TypeScript checks
- [x] Create a renewal-calendar checkpoint
- [x] Remove the dashboard renewal calendar
- [x] Replace letter badges with official provider logo assets
- [x] Fix add-subscription plan selection so selected plans update and save correctly
- [x] Validate logo rendering and the repaired plan-selection flow
- [x] Create an official-logos and plan-selection checkpoint
- [x] Add a brief success confirmation after a subscription is saved
- [x] Add dashboard sorting by highest cost and upcoming billing date
- [x] Add direct dashboard edit and delete controls for subscriptions
- [x] Validate the new dashboard interactions with automated tests and TypeScript checks
- [x] Create a dashboard-interactions checkpoint
- [x] Add a dashboard search bar for provider and plan names
- [x] Show clear no-match feedback without disturbing dashboard sorting or management controls
- [x] Validate dashboard search and save a search-feature checkpoint
- [x] Add a persistent light/dark theme switch for the app
- [x] Highlight matching provider and plan text in dashboard search results
- [x] Add subscription category filters beside dashboard search
- [x] Persist the selected dashboard sort order in local storage
- [x] Validate personalization and filtering controls and save a checkpoint
- [x] Add subscription spend summary metrics and category breakdown calculations
- [x] Add actionable spend insights based on saved subscriptions and upcoming charges
- [x] Add a dashboard summary and insight presentation
- [x] Validate spend calculations and save a summary-feature checkpoint
- [x] Add a persistent monthly subscription budget and dashboard progress indicator
- [x] Add a local month-over-month subscription spend trend chart
- [x] Make insights open the most relevant subscription for editing
- [x] Fix the dashboard delete-record action
- [x] Validate budget, trend, insight actions, and deletion flow and save a checkpoint
- [x] Add an immediate deletion toast with an undo action
- [x] Add a prominent over-budget warning state to the budget progress view
- [x] Add a category-level breakdown to the projected spend trend
- [x] Validate undo, warning, and category trend behavior and save a checkpoint
- [x] Repair the delete action and verify local record removal and undo behavior
- [x] Add mandatory-field indicators and inline validation to subscription entry
- [x] Add calendar date selectors for renewal and trial-end dates
- [x] Research and update catalog plan prices from official provider sources
- [x] Verify and refresh provider logo assets across the catalog
- [x] Repair dashboard search matching and category-filter interaction
- [x] Validate deletion, form validation, dates, catalog data, logos, and search and save a checkpoint
- [x] Ensure the dashboard exits local-data loading reliably in the web preview and on device
- [x] Ensure the dashboard exits local-data loading reliably in the web preview and on device
- [x] Remove visible subscription-deletion controls from the dashboard and detail screen
- [x] Validate the deletion-free subscription-management flow and save a checkpoint
- [x] Add a quick-edit modal for renewal dates and amounts
- [x] Restore record deletion exclusively in the Subscriptions tab
- [x] Validate quick editing and Subscriptions-tab deletion and save a checkpoint
- [x] Restart the development service after the reported preview interruption
- [x] Resolve the previewer modification state and confirm the preview is available
- [x] Document the Android APK release path and temporary free authentication and database options
- [x] Configure an Expo web export and Vercel output directory to resolve the deployment failure
- [x] Validate the Vercel-compatible static output and save a checkpoint
- [x] Verify the committed Vercel settings and resolve the repeated public-output error
- [x] Remove the invalid Vercel framework field and validate the corrected static-export configuration
- [x] Provide the step-by-step Vercel deployment procedure for the Expo static export
- [x] Provide slow mobile-build status checks and escalation guidance
- [x] Provide the Expo EAS setup and first Android APK build command
- [x] Provide safe inspection and retry guidance for the Android build stalled at 1%
- [x] Package remaining local project changes into a clean checkpoint
- [x] Create a repository README covering SubTrack setup, privacy, deployment, and Android builds
- [x] Validate the README and save a documentation checkpoint
- [x] Add labeled repository screenshot placeholders to the README
- [x] Validate the README screenshot placeholders and save a checkpoint
- [x] Define a cloud user-data architecture and migration path for authenticated subscription sync
- [x] Document the prioritized next-stage SubTrack feature roadmap
- [x] Keep cloud database work on hold and document a user-centered local-first feature catalogue
- [x] Define local household members, shared-plan allocations, and contribution calculations
- [x] Add a household management screen and member contribution view
- [x] Add shared-plan assignment controls to subscription management
- [x] Validate household calculations and save a feature checkpoint

- [x] Restart the development service and verify the preview responds after the household feature update

- [x] Implement trial countdown and renewal protection surfaces locally
- [x] Validate trial countdown behavior and save a feature checkpoint

- [x] Implement a local upcoming-charges timeline grouped by today, this week, and this month
- [x] Validate the upcoming-charges timeline and save a feature checkpoint

- [x] Verify Family Add-on member assignment and subscription sharing end to end
- [x] Add or update deterministic coverage for Family Add-on sharing behavior

## Remaining local-first roadmap

- [x] Add flexible reminder lead times and quiet-hour preferences
- [x] Add selectable reminder lead times from 1 to 30 days
- [x] Add subscription review queue with keep, review, and cancel-officially guidance
- [x] Add savings simulator for monthly and annual cancellation impact
- [x] Add custom subscription creation for services outside the catalog
- [x] Add shared-plan badge and custom household split percentages
- [x] Add shared-plan badge and per-person contribution hint
- [x] Add calendar export for selected renewal dates
- [x] Skip encrypted local backup and restore flow by product decision
- [x] Skip optional biometric app lock by product decision
- [x] Add subscription health or attention score
- [x] Add comprehensive deterministic tests for all implemented roadmap features
- [x] Add deterministic tests for review queue and savings impact
- [x] Run complete project validation and save the roadmap checkpoint

- [x] Implement custom household percentage allocations and validate the split calculations

- [x] Keep the footer tab navigation available and functional throughout every primary app tab

- [x] Apply an electric royal-blue base and chartreuse/lime title system across the app

- [x] Revamp the mobile UI and UX across the primary subscription-management flows

- [x] Verify and package any outstanding project changes for publication

- [x] Repair broken visual surfaces and make light/dark themes clearly distinct
- [x] Prevent past dates from being selected as a subscription’s next renewal date
- [x] Add regression coverage and validate the stabilization fixes

- [x] Remove the dashboard subscriptions-worth-reviewing surface

- [x] Expand Discover with additional verified subscription services, plan data, official links, and logos

- [x] Generate a CRED-inspired visual preview of the SubTrack dashboard

- [x] Generate a matching premium light-mode visual preview of the SubTrack dashboard

- [x] Generate two additional original CRED-inspired premium dashboard concepts

- [x] Create a product-specific, world-class SubTrack dashboard concept with refined UX hierarchy

- [x] Replace the generic dashboard with a production-ready, original SubTrack interface and design system
