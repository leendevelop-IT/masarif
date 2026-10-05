/** Money math shared by the server (source of truth) and the client (live preview). */

export type TransactionType = "deposit" | "expense";

export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
export const clampTaxRate = (value: number) =>
  Math.min(100, Math.max(0, roundMoney(value)));

export type AmountInput = {
  type: TransactionType;
  /** The amount the user typed. For expenses this is usually the total including tax. */
  amount: number;
  amountIncludesTax: boolean;
  taxEnabled: boolean;
  taxRate: number;
};

/**
 * Deposits are never taxed. Expenses carry tax when enabled: either the entered
 * amount already includes it (the usual case, from a tax invoice) or it is added on top.
 */
export function computeAmounts(input: AmountInput) {
  const taxRate =
    input.type === "expense" && input.taxEnabled
      ? clampTaxRate(input.taxRate)
      : 0;
  const entered = roundMoney(Math.max(0, input.amount || 0));
  const totalAmount =
    input.type === "expense" && input.amountIncludesTax
      ? entered
      : roundMoney(entered + (entered * taxRate) / 100);
  const taxAmount =
    input.type === "expense"
      ? roundMoney(totalAmount - totalAmount / (1 + taxRate / 100))
      : 0;
  const amountBeforeTax = roundMoney(totalAmount - taxAmount);
  return { taxRate, totalAmount, taxAmount, amountBeforeTax };
}
