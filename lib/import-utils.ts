import { services } from "./catalog";
import { localDateSchema } from "./data-safety";
import type { BillingCadence, SubscriptionRecord } from "./subscription-types";

/** RFC 4180-style CSV reader: supports quoted commas, escaped quotes, and embedded newlines. */
export function parseCsv(text: string): string[][] {
  if (text.length > 10_000_000) throw new Error("CSV exceeds the 10 MB limit.");
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const character = source[i];
    if (character === '"') {
      if (quoted && source[i + 1] === '"') { value += '"'; i++; }
      else if (quoted || value.length === 0) quoted = !quoted;
      else throw new Error("Malformed quote in CSV.");
    } else if (character === "," && !quoted) { row.push(value); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[i + 1] === "\n") i++;
      row.push(value); if (row.some((cell) => cell.trim())) rows.push(row);
      row = []; value = "";
      if (rows.length > 1001) throw new Error("Import up to 1,000 transactions at a time.");
    } else value += character;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(value); if (row.some((cell) => cell.trim())) rows.push(row);
  if (rows.length > 1001) throw new Error("Import up to 1,000 transactions at a time.");
  return rows;
}
/** Parses a CSV amount. "1,234" is rejected because it may be 1234 or 1.234 depending on locale. */
export function parseCsvAmount(text: string | undefined) {
  const value = text?.trim() ?? "";
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value);
  if (/^\d{1,3}(,\d{3})+\.\d+$/.test(value) || /^\d{1,3}(,\d{3}){2,}$/.test(value)) return Number(value.replace(/,/g, ""));
  if (/^\d+,\d{1,2}$/.test(value)) return Number(value.replace(",", "."));
  return NaN;
}
export interface ImportedCharge { merchant: string; amount: number; currency: string; date: string; rowNumber: number; }
export function importTransactions(text: string, fallbackCurrency: string) {
  if (!/^[A-Za-z]{3}$/.test(fallbackCurrency)) throw new Error("Enter a three-letter default currency.");
  const [headers, ...rows] = parseCsv(text);
  if (!headers) throw new Error("CSV is empty.");
  const columns = headers.map((cell) => cell.trim().toLowerCase());
  const find = (...names: string[]) => columns.findIndex((column) => names.includes(column));
  const merchantColumn = find("merchant", "description", "name");
  const amountColumn = find("amount", "charge");
  const dateColumn = find("date", "charge_date", "transaction_date");
  const currencyColumn = find("currency");
  if ([merchantColumn, amountColumn, dateColumn].includes(-1)) throw new Error("CSV needs date, merchant (or description), and amount columns. Dates must be YYYY-MM-DD.");
  const charges: ImportedCharge[] = []; const rejected: number[] = []; const seen = new Set<string>();
  rows.forEach((row, index) => {
    const merchant = row[merchantColumn]?.trim();
    const amount = parseCsvAmount(row[amountColumn]);
    const currency = (currencyColumn >= 0 ? row[currencyColumn] : fallbackCurrency)?.trim().toUpperCase();
    const date = row[dateColumn]?.trim();
    if (!merchant || merchant.length > 200 || !Number.isFinite(amount) || amount <= 0 || amount > 1e9 || !currency || !/^[A-Z]{3}$/.test(currency) || !localDateSchema.safeParse(date).success) { rejected.push(index + 2); return; }
    const key = JSON.stringify([merchant.toLowerCase(), amount, currency, date]);
    if (seen.has(key)) return;
    seen.add(key); charges.push({ merchant, amount, currency, date, rowNumber: index + 2 });
  });
  return { charges, rejected };
}
export function potentialDuplicates(serviceId: string, planName: string, records: SubscriptionRecord[]) {
  const normalized = planName.trim().toLowerCase();
  return records.filter((record) => record.status !== "cancelled" &&
    (serviceId !== "custom" ? record.serviceId === serviceId : record.planName.trim().toLowerCase() === normalized));
}
export function suggestReceiptFields(text: string) {
  const service = services.find((item) => text.toLowerCase().includes(item.name.toLowerCase()));
  const currency = text.match(/\b(USD|INR|EUR|GBP|CAD|AUD|JPY)\b/i)?.[1]?.toUpperCase() ??
    (text.includes("₹") ? "INR" : text.includes("€") ? "EUR" : text.includes("£") ? "GBP" : undefined);
  const total = text.match(/(?:total(?:\s+paid)?|amount(?:\s+paid)?|charged)\s*[:=\-]?\s*(?:[A-Z]{3}\s*|[$₹€£]\s*)?(\d[\d,]*(?:\.\d{1,2})?)/i);
  const amount = total ? Number(total[1].replace(/,/g, "")) : undefined;
  const renewal = text.match(/(?:next\s+renewal|renews(?:\s+on)?)\s*[:=\-]?\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  return { serviceId: service?.id, name: service?.name, amount: amount && Number.isFinite(amount) && amount <= 1e9 ? amount : undefined, currency, renewalDate: renewal && localDateSchema.safeParse(renewal).success ? renewal : undefined };
}
export function cadenceLabel(cadence: BillingCadence) { return { weekly: "Every week", monthly: "Every month", quarterly: "Every 3 months", yearly: "Every year" }[cadence]; }
