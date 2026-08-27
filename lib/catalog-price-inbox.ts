import type { CatalogCorrectionRequest } from "./subscription-types";

export type CatalogPriceSourceStatus = "reviewable-india-source" | "context-required" | "manual-only";

export interface CatalogPriceInboxItem {
  id: string;
  serviceName: string;
  status: CatalogPriceSourceStatus;
  detail: string;
  sourceUrl: string;
  sourceLabel: string;
}

/**
 * Local baseline for the weekly India report. These entries are review prompts, not live prices,
 * and changing them does not alter catalog or personal subscription data.
 */
export const catalogPriceInboxBaseline: CatalogPriceInboxItem[] = [
  { id: "apple-music", serviceName: "Apple Music", status: "reviewable-india-source", detail: "Official India page publicly lists INR plans. Trials and student eligibility must stay separate from recurring reference prices.", sourceUrl: "https://www.apple.com/in/apple-music/", sourceLabel: "Apple Music India" },
  { id: "spotify", serviceName: "Spotify", status: "reviewable-india-source", detail: "Official India page publicly lists INR plan information. Introductory offers and student eligibility require manual review.", sourceUrl: "https://www.spotify.com/in-en/premium/", sourceLabel: "Spotify Premium India" },
  { id: "chatgpt", serviceName: "ChatGPT", status: "context-required", detail: "The public pricing page can present a non-India currency or audience. Do not infer an INR amount from another market.", sourceUrl: "https://chatgpt.com/pricing/", sourceLabel: "ChatGPT pricing" },
  { id: "google-one", serviceName: "Google One", status: "context-required", detail: "A public India-language page may not expose paid plan amounts. Keep the current label until an India-specific recurring price is verifiable.", sourceUrl: "https://one.google.com/about/plans?hl=en-IN", sourceLabel: "Google One plans" },
  { id: "youtube-premium", serviceName: "YouTube Premium", status: "context-required", detail: "Public plan pages can use browser locale or account context. A non-INR display is not India price evidence.", sourceUrl: "https://www.youtube.com/premium", sourceLabel: "YouTube Premium" },
  { id: "microsoft-365", serviceName: "Microsoft 365", status: "manual-only", detail: "The India product page needs a stable, readable public recurring-price table before it can support a catalog reference update.", sourceUrl: "https://www.microsoft.com/en-in/microsoft-365", sourceLabel: "Microsoft 365 India" },
];

export function getCatalogInboxSummary(corrections: CatalogCorrectionRequest[]) {
  return {
    reviewableSourceCount: catalogPriceInboxBaseline.filter((item) => item.status === "reviewable-india-source").length,
    contextRequiredCount: catalogPriceInboxBaseline.filter((item) => item.status === "context-required").length,
    localCorrectionCount: corrections.length,
  };
}
