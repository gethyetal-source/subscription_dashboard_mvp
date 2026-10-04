import { describe, expect, it } from "vitest";
import { importTransactions, parseCsv, potentialDuplicates, suggestReceiptFields } from "../lib/import-utils";
import { budgetPosition, cashFlowForecast, priceChangeImpact } from "../lib/insights";
import { buildRenewalCalendarExport, monthlyAmount } from "../lib/subscription-utils";
import type { SubscriptionRecord } from "../lib/subscription-types";

const record: SubscriptionRecord = { id: "test", serviceId: "netflix", planName: "Standard", amount: 10, currency: "USD", cadence: "monthly", renewalDate: "2026-01-31", status: "active", billingSource: "provider", reminderEnabled: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
describe("private imports", () => {
  it("parses quoted commas, escaped quotes, CRLF, and quoted newlines", () => {
    expect(parseCsv('date,merchant,amount\r\n2026-01-01,"Example, ""Plus""\nPlan",10')).toEqual([
      ["date", "merchant", "amount"], ["2026-01-01", 'Example, "Plus"\nPlan', "10"],
    ]);
    expect(() => parseCsv('merchant,amount\n"unfinished,10')).toThrow("unclosed");
  });
  it("skips malformed/refund rows and deduplicates rows without combining currencies", () => {
    const result = importTransactions("date,merchant,amount,currency\n2026-01-01,Netflix,10,USD\n2026-01-01,Netflix,10,USD\n2026-01-01,Netflix,10,EUR\n2026-02-30,Bad,10,USD\n2026-01-01,Refund,-10,USD\n2026-01-01,Bad,10oops,USD", "USD");
    expect(result.charges).toHaveLength(2);
    expect(result.rejected).toHaveLength(3);
  });
  it("reads decimal commas and thousands separators, and rejects ambiguous comma amounts", () => {
    const result = importTransactions('date,merchant,amount,currency\n2026-01-01,A,"10,50",EUR\n2026-01-01,B,"1,234.50",USD\n2026-01-01,C,"1,234",USD\n2026-01-01,D,"1,234,567",USD', "USD");
    expect(result.charges.map((charge) => charge.amount)).toEqual([10.5, 1234.5, 1234567]);
    expect(result.rejected).toEqual([4]);
  });
  it("does not guess an ambiguous dollar currency or use receipt dates as renewals", () => {
    expect(suggestReceiptFields("Netflix\nTotal: $15.49\nDate: 2026-01-01")).toMatchObject({ serviceId: "netflix", amount: 15.49, currency: undefined, renewalDate: undefined });
    expect(suggestReceiptFields("Total paid: INR 1,499.00\nNext renewal: 2026-02-01")).toMatchObject({ amount: 1499, currency: "INR", renewalDate: "2026-02-01" });
  });
  it("warns for active duplicates but not archived records", () => {
    expect(potentialDuplicates("netflix", "Different plan", [record])).toHaveLength(1);
    expect(potentialDuplicates("netflix", "Standard", [{ ...record, status: "cancelled" }])).toEqual([]);
  });
});
describe("financial insights", () => {
  it("forecasts each currency separately and uses next-charge overrides only once", () => {
    const forecast = cashFlowForecast([{ ...record, expectedNextCharge: 15 }, { ...record, id: "eur", currency: "EUR", amount: 8 }], new Date("2026-01-15T12:00:00"), 3);
    expect(forecast.map((bucket) => bucket.amounts)).toEqual([{ USD: 15, EUR: 8 }, { USD: 10, EUR: 8 }, { USD: 10, EUR: 8 }]);
  });
  it("compares budget only against its selected currency", () => {
    expect(budgetPosition([record, { ...record, id: "eur", currency: "EUR", amount: 100 }], { monthlyBudget: 20, budgetCurrency: "USD", dashboardSort: "upcoming", reminderDays: 3, notificationsEnabled: true })).toMatchObject({ monthly: 10, remaining: 10, excludedCurrencyCount: 1 });
    expect(monthlyAmount(12, "weekly")).toBe(52);
  });
  it("refuses cross-currency price-change comparisons", () => {
    const event = { id: "e", changedAt: record.updatedAt, previousPlanName: "A", nextPlanName: "B", previousAmount: 10, nextAmount: 15, previousCurrency: "USD", nextCurrency: "EUR", previousCadence: "monthly" as const, nextCadence: "monthly" as const };
    expect(priceChangeImpact(event)).toBeNull();
    expect(priceChangeImpact({ ...event, nextCurrency: "USD" })).toMatchObject({ monthlyChange: 5, annualChange: 60 });
  });
  it("exports future anchored dates and a valid single-Z timestamp", () => {
    const calendar = buildRenewalCalendarExport([record], new Date("2026-02-01T00:00:00Z"));
    expect(calendar).toContain("DTSTAMP:20260201T000000Z");
    expect(calendar).not.toContain("T000000ZZ");
    expect(calendar).toContain("DTSTART;VALUE=DATE:20260228");
    expect(calendar).toContain("DTSTART;VALUE=DATE:20260331");
    const extended = buildRenewalCalendarExport([{ ...record, notes: "₹".repeat(100) + "\rBEGIN:VEVENT" }], new Date("2026-02-01T00:00:00Z"));
    expect(extended.split("\r\n").every((line) => Buffer.byteLength(line, "utf8") <= 75)).toBe(true);
    expect(extended).not.toContain("\rBEGIN:VEVENT");
  });
  it("keeps the same calendar UID for an occurrence across rolling exports", () => {
    const uid = (calendar: string) => calendar.match(/UID:subtrack-test-2026-03-31@local/)?.[0];
    expect(uid(buildRenewalCalendarExport([record], new Date("2026-02-01T00:00:00Z")))).toBe("UID:subtrack-test-2026-03-31@local");
    expect(uid(buildRenewalCalendarExport([record], new Date("2026-03-15T00:00:00Z")))).toBe("UID:subtrack-test-2026-03-31@local");
  });
});
