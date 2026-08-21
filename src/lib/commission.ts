export const DEFAULT_CURRENCY = "GBP";

export function parseMoneyValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? roundToTwo(value) : null;
  }

  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return null;

  const matches = Array.from(
    normalized.matchAll(/(\d[\d.,]*)(?:\s*([kKmM]))?/g),
  );

  if (matches.length === 0) return null;

  const values = matches
    .map((match) => {
      const numeric = Number(normalizeNumericToken(match[1]));
      if (!Number.isFinite(numeric)) return null;
      const suffix = match[2]?.toLowerCase();
      if (suffix === "k") return numeric * 1000;
      if (suffix === "m") return numeric * 1000000;
      return numeric;
    })
    .filter((amount): amount is number => amount !== null);

  if (values.length === 0) return null;

  const average =
    values.reduce((total, amount) => total + amount, 0) / values.length;
  return roundToTwo(average);
}

export function parsePercentValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? roundToFour(value) : null;
  }

  if (typeof value !== "string") return null;

  const cleaned = value.replace("%", "").replace(",", ".").trim();
  if (!cleaned) return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? roundToFour(parsed) : null;
}

export function calculateCommissionAmount(
  dealValue: unknown,
  ratePercent: unknown,
): number | null {
  const parsedDealValue = parseMoneyValue(dealValue);
  const parsedRate = parsePercentValue(ratePercent);

  if (parsedDealValue === null || parsedRate === null) return null;
  return roundToTwo((parsedDealValue * parsedRate) / 100);
}

export function formatCommissionRate(ratePercent: unknown): string {
  const parsedRate = parsePercentValue(ratePercent);
  if (parsedRate === null) return "";

  return `${trimTrailingZeros(parsedRate)}%`;
}

export function formatCurrencyAmount(
  amount: unknown,
  currencyCode = DEFAULT_CURRENCY,
): string {
  const parsedAmount = parseMoneyValue(amount);
  if (parsedAmount === null) return "";

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currencyCode || DEFAULT_CURRENCY,
      maximumFractionDigits: parsedAmount % 1 === 0 ? 0 : 2,
    }).format(parsedAmount);
  } catch {
    return `${currencyCode || DEFAULT_CURRENCY} ${trimTrailingZeros(parsedAmount)}`;
  }
}

export function resolveCommissionFields(input: {
  estimatedDealSize?: unknown;
  estimatedDealValue?: unknown;
  commissionRate?: unknown;
  commissionRatePercent?: unknown;
  partnerCommissionRatePercent?: unknown;
  lbcCommission?: unknown;
  lbcCommissionAmount?: unknown;
  currencyCode?: string | null;
}) {
  const currencyCode = input.currencyCode || DEFAULT_CURRENCY;
  const estimatedDealValue =
    parseMoneyValue(input.estimatedDealValue) ??
    parseMoneyValue(input.estimatedDealSize);

  const commissionRatePercent =
    parsePercentValue(input.commissionRatePercent) ??
    parsePercentValue(input.commissionRate) ??
    parsePercentValue(input.partnerCommissionRatePercent);

  const lbcCommissionAmount =
    parseMoneyValue(input.lbcCommissionAmount) ??
    calculateCommissionAmount(estimatedDealValue, commissionRatePercent) ??
    parseMoneyValue(input.lbcCommission);

  return {
    currencyCode,
    estimatedDealValue,
    commissionRatePercent,
    lbcCommissionAmount,
    commissionRateDisplay:
      commissionRatePercent !== null
        ? formatCommissionRate(commissionRatePercent)
        : typeof input.commissionRate === "string"
          ? input.commissionRate
          : null,
    lbcCommissionDisplay:
      lbcCommissionAmount !== null
        ? formatCurrencyAmount(lbcCommissionAmount, currencyCode)
        : typeof input.lbcCommission === "string"
          ? input.lbcCommission
          : null,
  };
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function roundToFour(value: number) {
  return Math.round(value * 10000) / 10000;
}

function trimTrailingZeros(value: number) {
  return value.toLocaleString("en-GB", {
    maximumFractionDigits: 4,
    useGrouping: false,
  });
}

function normalizeNumericToken(value: string) {
  const token = value.replace(/\s+/g, "");
  const hasDot = token.includes(".");
  const hasComma = token.includes(",");

  if (hasDot && hasComma) {
    const lastDot = token.lastIndexOf(".");
    const lastComma = token.lastIndexOf(",");

    if (lastComma > lastDot) {
      return token.replace(/\./g, "").replace(",", ".");
    }

    return token.replace(/,/g, "");
  }

  if (hasDot) {
    const parts = token.split(".");
    const usesDotAsThousands =
      parts.length > 1 &&
      parts[0].length <= 3 &&
      parts.slice(1).every((part) => part.length === 3);

    return usesDotAsThousands ? parts.join("") : token;
  }

  if (hasComma) {
    const parts = token.split(",");
    const usesCommaAsThousands =
      parts.length > 1 &&
      parts[0].length <= 3 &&
      parts.slice(1).every((part) => part.length === 3);

    return usesCommaAsThousands ? parts.join("") : token.replace(",", ".");
  }

  return token;
}
