import { describe, it, expect } from "vitest";
import {
  checkDepositCap,
  calculateEstimatedMargin,
  calculateMarginPercent,
  calculatePercentBilled,
  BIF_DEPOSIT_CAP_THRESHOLD,
  BIF_DEPOSIT_CAP_RATE,
  DEPOSIT_CAP_LOWER_THRESHOLD,
} from "./financial-calcs";

describe("checkDepositCap", () => {
  it("does not flag a contract at or under the $3,300 threshold — the Act doesn't apply", () => {
    const result = checkDepositCap(DEPOSIT_CAP_LOWER_THRESHOLD, 3000);
    expect(result.breached).toBe(false);
    expect(result.capRate).toBeNull();
  });

  it("breaches the 10% Level 1 cap on a contract between $3,301 and $19,999", () => {
    // $15,000 contract, 20% deposit — over the 10% Level 1 cap.
    const result = checkDepositCap(15000, 3000);
    expect(result.breached).toBe(true);
    expect(result.capRate).toBe(10);
  });

  it("does not breach at exactly 10% deposit on a Level 1 contract", () => {
    const result = checkDepositCap(15000, 1500);
    expect(result.breached).toBe(false);
    expect(result.percent).toBeCloseTo(10, 5);
  });

  it("does not breach when contract value is below the $20,000 threshold if within the 10% Level 1 cap", () => {
    const result = checkDepositCap(19999, 1999);
    expect(result.breached).toBe(false);
  });

  it("breaches when a Level 1 contract's deposit exceeds 10% (previously silently missed as a 5%-only check)", () => {
    // $19,999 contract, 50% deposit — this used to slip through entirely under the old flat-5%-only logic.
    const result = checkDepositCap(19999, 10000);
    expect(result.breached).toBe(true);
    expect(result.capRate).toBe(10);
  });

  it("does not breach at exactly the $20,000 threshold (Level 1 10% cap still applies at the threshold itself)", () => {
    const result = checkDepositCap(BIF_DEPOSIT_CAP_THRESHOLD, 1000);
    expect(result.breached).toBe(false);
    expect(result.capRate).toBe(10);
  });

  it("applies the 5% Level 2 cap once contract value exceeds $20,000", () => {
    const result = checkDepositCap(20001, 20001 * BIF_DEPOSIT_CAP_RATE);
    expect(result.breached).toBe(false);
    expect(result.percent).toBeCloseTo(5, 5);
    expect(result.capRate).toBe(5);
  });

  it("breaches just over 5% deposit on a contract over the $20,000 threshold", () => {
    const result = checkDepositCap(100000, 5001);
    expect(result.breached).toBe(true);
    expect(result.percent).toBeCloseTo(5.001, 3);
  });

  it("breaches a large deposit on a large contract", () => {
    const result = checkDepositCap(500000, 100000);
    expect(result.breached).toBe(true);
    expect(result.percent).toBe(20);
  });

  it("returns breached: false and percent: null when contract value is missing", () => {
    expect(checkDepositCap(null, 5000)).toEqual({ breached: false, percent: null, capRate: null });
  });

  it("returns breached: false and percent: null when deposit amount is missing", () => {
    expect(checkDepositCap(100000, null)).toEqual({ breached: false, percent: null, capRate: null });
  });

  it("returns breached: false and percent: null when contract value is zero or negative", () => {
    expect(checkDepositCap(0, 1000)).toEqual({ breached: false, percent: null, capRate: null });
    expect(checkDepositCap(-100, 1000)).toEqual({ breached: false, percent: null, capRate: null });
  });
});

describe("calculateEstimatedMargin", () => {
  it("subtracts all committed costs from the revised contract value", () => {
    const margin = calculateEstimatedMargin({
      revisedContractValue: 500000,
      totalSubCommitted: 200000,
      totalMaterialsCost: 80000,
      totalLabourCost: 60000,
    });
    expect(margin).toBe(160000);
  });

  it("can be negative when costs exceed contract value", () => {
    const margin = calculateEstimatedMargin({
      revisedContractValue: 100000,
      totalSubCommitted: 80000,
      totalMaterialsCost: 30000,
      totalLabourCost: 10000,
    });
    expect(margin).toBe(-20000);
  });

  it("returns the full contract value when there are no costs yet", () => {
    const margin = calculateEstimatedMargin({
      revisedContractValue: 250000,
      totalSubCommitted: 0,
      totalMaterialsCost: 0,
      totalLabourCost: 0,
    });
    expect(margin).toBe(250000);
  });
});

describe("calculateMarginPercent", () => {
  it("computes margin as a rounded percentage of revised contract value", () => {
    expect(calculateMarginPercent(160000, 500000)).toBe(32);
  });

  it("returns null when revised contract value is zero", () => {
    expect(calculateMarginPercent(1000, 0)).toBeNull();
  });

  it("returns null when revised contract value is negative", () => {
    expect(calculateMarginPercent(1000, -100)).toBeNull();
  });

  it("handles a negative margin", () => {
    expect(calculateMarginPercent(-20000, 100000)).toBe(-20);
  });
});

describe("calculatePercentBilled", () => {
  it("computes a rounded percentage billed", () => {
    expect(calculatePercentBilled(250000, 500000)).toBe(50);
  });

  it("caps at 100 even if claims exceed contract value", () => {
    expect(calculatePercentBilled(600000, 500000)).toBe(100);
  });

  it("returns null when revised contract value is zero", () => {
    expect(calculatePercentBilled(1000, 0)).toBeNull();
  });

  it("returns 0 when nothing has been claimed yet", () => {
    expect(calculatePercentBilled(0, 500000)).toBe(0);
  });
});
