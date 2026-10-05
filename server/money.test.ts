import { describe, expect, it } from "vitest";
import { computeAmounts } from "../shared/money";

describe("computeAmounts", () => {
  it("never taxes deposits", () => {
    expect(
      computeAmounts({
        type: "deposit",
        amount: 1000,
        amountIncludesTax: false,
        taxEnabled: true,
        taxRate: 15,
      })
    ).toEqual({
      taxRate: 0,
      totalAmount: 1000,
      taxAmount: 0,
      amountBeforeTax: 1000,
    });
  });

  it("splits a tax-inclusive expense into net and tax", () => {
    expect(
      computeAmounts({
        type: "expense",
        amount: 115,
        amountIncludesTax: true,
        taxEnabled: true,
        taxRate: 15,
      })
    ).toEqual({
      taxRate: 15,
      totalAmount: 115,
      taxAmount: 15,
      amountBeforeTax: 100,
    });
  });

  it("adds tax on top when the amount excludes it", () => {
    expect(
      computeAmounts({
        type: "expense",
        amount: 200,
        amountIncludesTax: false,
        taxEnabled: true,
        taxRate: 15,
      })
    ).toEqual({
      taxRate: 15,
      totalAmount: 230,
      taxAmount: 30,
      amountBeforeTax: 200,
    });
  });

  it("treats disabled tax as zero and rounds to cents", () => {
    expect(
      computeAmounts({
        type: "expense",
        amount: 99.999,
        amountIncludesTax: true,
        taxEnabled: false,
        taxRate: 15,
      })
    ).toEqual({
      taxRate: 0,
      totalAmount: 100,
      taxAmount: 0,
      amountBeforeTax: 100,
    });
    expect(
      computeAmounts({
        type: "expense",
        amount: 10,
        amountIncludesTax: true,
        taxEnabled: true,
        taxRate: 150,
      }).taxRate
    ).toBe(100);
  });
});
