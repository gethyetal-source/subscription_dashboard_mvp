import { describe, expect, it } from "vitest";
import { countries, countrySettingsPatch, defaultCurrency, getCountry, searchCountries } from "../lib/countries";
import { COUNTRY_DATA_LICENSE } from "../lib/country-data-license";
import { createBackup, migrateLocalState, parseBackup, settingsSchema } from "../lib/data-safety";
import { LocalStateRepository, emptySnapshot } from "../lib/local-state-repository";
import type { SubscriptionRecord } from "../lib/subscription-types";

describe("country and currency defaults", () => {
  it("ships the data license with the app", () => {
    expect(COUNTRY_DATA_LICENSE).toContain("Copyright © 2015-2024 Unicode, Inc.");
    expect(COUNTRY_DATA_LICENSE).toContain("Permission is hereby granted, free of charge");
    expect(COUNTRY_DATA_LICENSE).toContain("SPDX-License-Identifier: Unicode-3.0");
  });
  it("provides unique supported country/territory codes and three-letter currencies", () => {
    expect(countries).toHaveLength(254);
    expect(new Set(countries.map((country) => country.code)).size).toBe(countries.length);
    expect(countries.every((country) => /^[A-Z]{2}$/.test(country.code) && /^[A-Z]{3}$/.test(country.currency))).toBe(true);
  });
  it.each([
    ["IN", "INR"], ["US", "USD"], ["GB", "GBP"], ["CA", "CAD"], ["AU", "AUD"],
    ["AE", "AED"], ["JP", "JPY"], ["DE", "EUR"], ["ZA", "ZAR"], ["BR", "BRL"],
    ["BG", "EUR"], ["CW", "XCG"], ["SX", "XCG"], ["ZW", "ZWG"], ["LS", "LSL"],
  ])("uses %s's current billing currency, %s", (code, currency) => {
    expect(getCountry(code)?.currency).toBe(currency);
  });
  it("normalizes country codes without guessing unknown countries", () => {
    expect(getCountry(" in ")).toEqual(getCountry("IN"));
    expect(getCountry("ZZ")).toBeUndefined();
    expect(getCountry()).toBeUndefined();
  });
  it("searches names, currency codes, country codes, and accented names", () => {
    expect(searchCountries("united kingdom").map((country) => country.code)).toEqual(["GB"]);
    expect(searchCountries(" INR ").map((country) => country.code)).toEqual(["IN"]);
    expect(searchCountries(" us ").map((country) => country.code)).toEqual(["US"]);
    expect(searchCountries("curaçao").map((country) => country.code)).toEqual(["CW"]);
    expect(searchCountries("curacao").map((country) => country.code)).toEqual(["CW"]);
    expect(searchCountries("nonexistent country")).toEqual([]);
  });
  it("uses a chosen country's currency independently of a foreign-currency budget", () => {
    expect(defaultCurrency({ countryCode: "IN", budgetCurrency: "USD" })).toBe("INR");
    expect(defaultCurrency({ budgetCurrency: "EUR" })).toBe("EUR");
    expect(defaultCurrency({})).toBe("USD");
  });
  it("uses the new currency for an unset budget, but never relabels a saved budget", () => {
    const settings = emptySnapshot().settings;
    expect(countrySettingsPatch(settings, "IN")).toEqual({ countryCode: "IN", budgetCurrency: "INR" });
    expect(countrySettingsPatch({ ...settings, monthlyBudget: 100 }, "IN")).toEqual({ countryCode: "IN" });
    expect(() => countrySettingsPatch(settings, "ZZ")).toThrow("Choose a supported country");
  });
  it("accepts legacy settings and validates a new country preference", () => {
    const settings = emptySnapshot().settings;
    expect(settingsSchema.parse(settings).countryCode).toBeUndefined();
    expect(settingsSchema.parse({ ...settings, countryCode: "in" }).countryCode).toBe("IN");
    expect(() => settingsSchema.parse({ ...settings, countryCode: "ZZ" })).toThrow();
    expect(migrateLocalState(emptySnapshot()).settings.countryCode).toBeUndefined();
  });
  it("persists country changes and backs them up without changing any saved amounts", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => { values.set(key, value); },
    };
    const record: SubscriptionRecord = {
      id: "usd", serviceId: "custom", planName: "My plan", amount: 12.5, currency: "USD",
      cadence: "monthly", renewalDate: "2026-10-10", billingSource: "provider", status: "active",
      reminderEnabled: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    };
    const repository = new LocalStateRepository(storage, () => undefined);
    await repository.update((current) => ({
      ...current, subscriptions: [record], settings: { ...current.settings, monthlyBudget: 100, budgetCurrency: "USD" },
      savingsEntries: [{ id: "saving", amount: 5, currency: "USD", occurredOn: "2026-10-01", note: "Checked refund" }],
    }));
    const before = repository.current;
    await repository.update((current) => ({ ...current, settings: { ...current.settings, ...countrySettingsPatch(current.settings, "JP") } }));
    const restored = new LocalStateRepository(storage, () => undefined);
    await restored.load();
    expect(restored.current.settings).toMatchObject({ countryCode: "JP", monthlyBudget: 100, budgetCurrency: "USD" });
    expect(restored.current.subscriptions).toEqual(before.subscriptions);
    expect(restored.current.savingsEntries).toEqual(before.savingsEntries);
    expect(parseBackup(JSON.stringify(createBackup(restored.current)))).toEqual(restored.current);
    expect(defaultCurrency(restored.current.settings)).toBe("JPY");
  });
});
