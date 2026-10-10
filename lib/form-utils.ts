export function parseMoneyInput(input: string): number | undefined {
  const text = input.trim();
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return undefined;
  const amount = Number(text.replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 && amount <= 1e9 ? amount : undefined;
}
