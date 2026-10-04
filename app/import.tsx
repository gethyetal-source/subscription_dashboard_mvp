import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { router } from "expo-router";
import { Button, Card, Copy, Field, Page } from "@/components/app-ui";
import { chooseTextFile } from "@/lib/file-transfer";
import { importTransactions, suggestReceiptFields, type ImportedCharge } from "@/lib/import-utils";
import { recognizeReceipt } from "@/lib/receipt-recognition";
import { useSubscriptions } from "@/lib/subscription-store";
import { useMoneyFormatter } from "@/lib/privacy";

export default function ImportScreen() {
  const store = useSubscriptions(); const money = useMoneyFormatter();
  const [text, setText] = useState(""); const [currency, setCurrency] = useState("USD");
  const [charges, setCharges] = useState<ImportedCharge[]>([]); const [saved, setSaved] = useState<number[]>([]);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setMessage("");
    try { await operation(); } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed."); } finally { setBusy(false); }
  };
  const suggestion = suggestReceiptFields(text);
  return <Page title="Private import" subtitle="Nothing is saved until you review and confirm it. No bank login, inbox access, or cloud OCR.">
    <Card title="Receipt or screenshot">
      <Copy muted>{Platform.OS === "web" ? "Recognition runs in your browser. The OCR worker and English model may be downloaded on first use; your image stays in the browser." : "Recognition runs on this Android device. A new APK is required for the native OCR module."}</Copy>
      <Button label={busy ? "Processing…" : "Choose image and recognize locally"} disabled={busy} onPress={() => void run(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, base64: false });
        if (!result.canceled) {
          if (result.assets[0].fileSize && result.assets[0].fileSize > 10_000_000) throw new Error("Choose an image smaller than 10 MB.");
          setText(await recognizeReceipt(result.assets[0].uri));
        }
      })} />
      <Field label="Recognized text (editable)" multiline value={text} maxLength={100_000} onChangeText={setText} style={{ minHeight: 150, maxHeight: 300 }} />
      {text.trim() ? <>
        <Copy>Suggested service: {suggestion.name ?? "Unrecognized"} · Amount: {suggestion.amount !== undefined ? money(suggestion.amount, suggestion.currency ?? currency) : "Not found"}</Copy>
        <Copy muted>Currency symbols can be ambiguous. Receipt dates are not assumed to be renewal dates. Review every field before saving.</Copy>
        <Button label="Review as a new subscription" secondary onPress={() => router.push({ pathname: "/quick-add", params: {
          name: suggestion.name ?? "", serviceId: suggestion.serviceId ?? "custom", amount: suggestion.amount === undefined ? "" : String(suggestion.amount),
          currency: suggestion.currency ?? currency, renewalDate: suggestion.renewalDate ?? "",
        } } as never)} />
      </> : null}
    </Card>
    <Card title="Transaction CSV">
      <Copy muted>Required columns: date, merchant, amount. Optional: currency. Dates must be YYYY-MM-DD. Positive charges only; refunds and invalid rows are skipped.</Copy>
      <Field label="Default currency for rows without a currency column" value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} />
      <Button label="Choose CSV and review rows" secondary disabled={busy} onPress={() => void run(async () => {
        const csv = await chooseTextFile(["text/csv", "text/plain", "application/vnd.ms-excel"]);
        if (csv === null) return;
        const result = importTransactions(csv, currency); setCharges(result.charges); setSaved([]);
        setMessage(`${result.charges.length} unique rows ready for review. ${result.rejected.length} invalid/refund rows skipped.`);
      })} />
      <Copy muted>Rows do not establish a recurring subscription. Save a charge to your local recognition worksheet, or explicitly create a subscription after checking its billing cadence.</Copy>
    </Card>
    {charges.map((charge) => <Card key={charge.rowNumber} title={charge.merchant}>
      <Copy>{charge.date} · {money(charge.amount, charge.currency)}</Copy>
      <Button label={saved.includes(charge.rowNumber) ? "Saved to recognition worksheet" : "Save this reviewed charge"} disabled={busy || saved.includes(charge.rowNumber)} secondary onPress={() => void run(async () => {
        await store.saveChargeRecognitionCase({ merchantLabel: charge.merchant, amount: charge.amount, currency: charge.currency, chargeDate: charge.date, billingSource: "unknown", paymentRail: "unknown" });
        setSaved((current) => [...current, charge.rowNumber]);
      })} />
      <Button label="Review as a subscription" disabled={busy} secondary onPress={() => router.push({ pathname: "/quick-add", params: { name: charge.merchant, amount: String(charge.amount), currency: charge.currency } } as never)} />
    </Card>)}
    {message ? <Copy>{message}</Copy> : null}
  </Page>;
}
