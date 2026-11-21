import { describe, expect, it } from 'vitest';
import { parsePrice, priceValue } from './price';

describe('parsePrice', () => {
  it('reads a plain price with a decimal point (as the scan returns it)', () => {
    expect(parsePrice('45.00')).toEqual({ min: 45, max: 45 });
  });

  it('reads a German decimal comma', () => {
    expect(parsePrice('12,50')).toEqual({ min: 12.5, max: 12.5 });
  });

  it('reads integers', () => {
    expect(parsePrice('38')).toEqual({ min: 38, max: 38 });
  });

  it('reads a range from the scan', () => {
    expect(parsePrice('22.00 - 28.00')).toEqual({ min: 22, max: 28 });
  });

  it('reads ranges with other dashes and without spaces', () => {
    expect(parsePrice('25–35')).toEqual({ min: 25, max: 35 });
    expect(parsePrice('25-35')).toEqual({ min: 25, max: 35 });
    expect(parsePrice('12,50 bis 15,90')).toEqual({ min: 12.5, max: 15.9 });
  });

  it('ignores currency symbols and words', () => {
    expect(parsePrice('€ 45')).toEqual({ min: 45, max: 45 });
    expect(parsePrice('ca. 30 €')).toEqual({ min: 30, max: 30 });
    expect(parsePrice('45 EUR')).toEqual({ min: 45, max: 45 });
  });

  it('reads thousands separators', () => {
    expect(parsePrice('1.250')).toEqual({ min: 1250, max: 1250 });
    expect(parsePrice('1.250,00')).toEqual({ min: 1250, max: 1250 });
    expect(parsePrice('1,250.00')).toEqual({ min: 1250, max: 1250 });
  });

  it('orders a reversed range', () => {
    expect(parsePrice('35 - 25')).toEqual({ min: 25, max: 35 });
  });

  it('returns null when there is no price', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('Preis offen')).toBeNull();
    expect(parsePrice('   ')).toBeNull();
  });
});

describe('priceValue', () => {
  it('uses the midpoint of a range', () => {
    expect(priceValue('25.00 - 35.00')).toBe(30);
  });

  it('uses the price itself when it is not a range', () => {
    expect(priceValue('12,50')).toBe(12.5);
  });

  it('is 0 when there is no price', () => {
    expect(priceValue('')).toBe(0);
  });
});
