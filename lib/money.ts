/** "NPR 1,500" / "NPR 1,500.50". Falls back to a plain string if the currency code is unknown. */
export function formatMoney(amount: number, currency = "NPR"): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
