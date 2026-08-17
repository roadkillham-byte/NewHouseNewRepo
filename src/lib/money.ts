/**
 * The only place currency is converted between integer cents (how every
 * amount is stored and computed throughout the app) and a display string or
 * user-entered value. Never do this conversion inline elsewhere — floats
 * cannot represent money exactly, and every stray `* 100` is a future bug.
 */

const CURRENCY = "AUD";
const LOCALE = "en-AU";

const formatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
});

/** Format integer cents as a display string, e.g. 129900 -> "$1,299.00". */
export function formatMoney(cents: number): string {
  if (!Number.isFinite(cents)) {
    throw new Error(`formatMoney: not a finite number: ${cents}`);
  }
  return formatter.format(cents / 100);
}

/**
 * Parse a user-entered amount (e.g. from a text input) into integer cents.
 * Accepts "12.5", "12.50", "$12.50", "1,234.50". Throws on anything that
 * isn't a valid non-negative amount with at most 2 decimal places.
 */
export function parseMoney(input: string): number {
  const cleaned = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`parseMoney: invalid amount: "${input}"`);
  }
  const [wholePart, fractionPart = ""] = cleaned.split(".");
  const cents = Number(wholePart) * 100 + Number(fractionPart.padEnd(2, "0"));
  return cents;
}

/** Sum an array of integer-cent amounts. */
export function sumCents(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
