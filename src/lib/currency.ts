import { DEFAULT_CURRENCY, parseMoneyValue } from "@/lib/commission";

export type CurrencyCode = "GBP" | "USD" | "EUR" | "TRY";

export const GBP_RATE_DATE = "2026-06-04";

export const GBP_EXCHANGE_RATES: Record<CurrencyCode, number> = {
  GBP: 1,
  USD: 0.74357,
  EUR: 0.86459,
  TRY: 0.01618,
};

type OpportunityLike = {
  estimated_deal_size?: string | null;
  estimated_deal_value?: number | string | null;
  currency_code?: string | null;
};

export function normalizeCurrencyCode(value?: string | null): CurrencyCode {
  const normalized = value?.trim().toUpperCase();

  if (normalized === "USD") return "USD";
  if (normalized === "EUR") return "EUR";
  if (normalized === "TRY" || normalized === "TL") return "TRY";
  return "GBP";
}

export function detectCurrencyFromText(
  value?: string | null,
  fallbackCurrency?: string | null,
): CurrencyCode {
  const normalized = value?.toUpperCase() || "";

  if (/[₺]|(?:^|[^A-Z])(?:TRY|TL)(?:[^A-Z]|$)/.test(normalized)) return "TRY";
  if (/US\$|(?:^|[^A-Z])USD(?:[^A-Z]|$)|\$/.test(normalized)) return "USD";
  if (/€|(?:^|[^A-Z])EUR(?:[^A-Z]|$)/.test(normalized)) return "EUR";
  if (/£|(?:^|[^A-Z])GBP(?:[^A-Z]|$)/.test(normalized)) return "GBP";

  return normalizeCurrencyCode(fallbackCurrency || DEFAULT_CURRENCY);
}

export function convertToGBP(
  amount: number | null | undefined,
  currencyCode?: string | null,
) {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return 0;
  }

  const currency = normalizeCurrencyCode(currencyCode);
  return Math.round(amount * GBP_EXCHANGE_RATES[currency] * 100) / 100;
}

export function getMoneyValueInGBP(
  amount: unknown,
  currencyCode?: string | null,
  sourceText?: string | null,
) {
  const parsedAmount = parseMoneyValue(amount);
  if (parsedAmount === null) return 0;

  return convertToGBP(
    parsedAmount,
    detectCurrencyFromText(sourceText || (typeof amount === "string" ? amount : null), currencyCode),
  );
}

export function getOpportunityValueInGBP(opportunity: OpportunityLike) {
  if (opportunity.estimated_deal_size) {
    return getMoneyValueInGBP(
      opportunity.estimated_deal_size,
      opportunity.currency_code,
      opportunity.estimated_deal_size,
    );
  }

  return getMoneyValueInGBP(
    opportunity.estimated_deal_value,
    opportunity.currency_code,
  );
}

export function formatGBPAmount(value?: number | null) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: value && Math.abs(value) >= 1000000 ? "compact" : "standard",
    maximumFractionDigits: value && Math.abs(value) >= 1000000 ? 1 : 0,
  }).format(value || 0);
}
