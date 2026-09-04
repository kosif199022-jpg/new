export type Money = Readonly<{ currency: string; minor: bigint }>;

function normalizeCurrency(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) throw new Error('Money currency must be a 3-letter ISO-style code');
  return normalized;
}

export const money = (currency: string, minor: bigint): Money => ({
  currency: normalizeCurrency(currency),
  minor
});

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new Error('Money currency mismatch');
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { currency: a.currency, minor: a.minor + b.minor };
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { currency: a.currency, minor: a.minor - b.minor };
}

export function negateMoney(value: Money): Money {
  return { currency: value.currency, minor: -value.minor };
}
