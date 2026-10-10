import { useEffect, useState } from "react";
import { View } from "react-native";
import { Copy, Notice } from "./app-ui";
import { ActionSheet, FinanceLink, SearchField } from "./finance-ui";
import { searchCountries, type Country } from "@/lib/countries";

export function CountryPickerSheet({ visible, countryCode, busy = false, error, onSelect, onClose }: {
  visible: boolean;
  countryCode?: string;
  busy?: boolean;
  error?: string;
  onSelect: (country: Country) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (visible) setQuery(""); }, [visible]);
  const matching = visible ? searchCountries(query) : [];

  return <ActionSheet visible={visible} title="Country & currency" onClose={onClose}>
    <Copy muted>Your country sets the default currency for new entries. Existing prices and budgets are not converted.</Copy>
    {error ? <Notice error>{error}</Notice> : null}
    <SearchField value={query} onChange={setQuery} placeholder="Search country or currency" label="Search countries" />
    <View>
      {matching.map((country) => <FinanceLink key={country.code}
        icon={countryCode === country.code ? "checkmark-circle-outline" : "globe-outline"}
        title={country.name} detail={`${country.code} · ${country.currency}`}
        selected={countryCode === country.code} disabled={busy}
        onPress={() => onSelect(country)} />)}
      {!matching.length ? <Copy muted>No countries match. Try a country name, code, or currency.</Copy> : null}
    </View>
  </ActionSheet>;
}
