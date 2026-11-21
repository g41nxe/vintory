// A wine's price is free text (ADR 0003: stored as entered). The scan returns
// "45.00" or ranges like "22.00 - 28.00"; users type "12,50", "ca. 30 €", …
// These helpers read it for calculations only – the stored text is never changed.

export interface PriceRange {
  min: number;
  max: number;
}

/** Turns one number as written ("12,50", "1.250", "1,250.00") into a JS number. */
const toNumber = (token: string): number => {
  const hasDot = token.includes('.');
  const hasComma = token.includes(',');
  let normalized = token;
  if (hasDot && hasComma) {
    // The separator that comes last is the decimal one; the other groups thousands.
    const decimal = token.lastIndexOf('.') > token.lastIndexOf(',') ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    normalized = token.split(thousands).join('').replace(decimal, '.');
  } else if (hasComma) {
    normalized = token.replace(',', '.');
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(token)) {
    // "1.250" – German thousands separator, not a decimal point.
    normalized = token.split('.').join('');
  }
  return Number(normalized);
};

/** Reads a price or price range from free text. Returns null if it contains no number. */
export const parsePrice = (text: string): PriceRange | null => {
  const numbers = (text.match(/\d[\d.,]*\d|\d/g) || [])
    .map(toNumber)
    .filter((n) => Number.isFinite(n));
  if (numbers.length === 0) return null;
  const [a, b = a] = numbers;
  return { min: Math.min(a, b), max: Math.max(a, b) };
};

/** One number for sorting and totals: the midpoint of a range, 0 without a price. */
export const priceValue = (text: string): number => {
  const range = parsePrice(text);
  return range ? (range.min + range.max) / 2 : 0;
};
