// Pure money-math helpers, pulled out and unit-tested on their own because
// they carry real financial/legal weight: the deposit cap check is a
// statutory threshold, and the margin calc is what a builder sees as "am I
// actually making money on this job". A silent bug in either one is the
// kind of thing that erodes trust in a compliance tool fast.

// Corrected during the July 2026 QBCC compliance audit: this cap comes from
// the Domestic Building Contracts provisions — now Schedule 1B of the QBCC
// Act (originally the standalone Domestic Building Contracts Act 2000) —
// not the BIF Act (which governs payment claims/adjudication/trust
// accounts, a separate regime). It was also previously modelled as a flat
// 5% cap on contracts over $20,000, which silently missed the lower tier:
// contracts from $3,301–$19,999 are capped at 10%, not left unlimited.
export const DEPOSIT_CAP_LOWER_THRESHOLD = 3300; // written-contract threshold; below this the Act doesn't apply
export const DEPOSIT_CAP_UPPER_THRESHOLD = 20000; // contract value above which the lower (5%) cap applies
export const DEPOSIT_CAP_LOWER_TIER_RATE = 0.1; // $3,301–$19,999 ("Level 1" contract)
export const DEPOSIT_CAP_UPPER_TIER_RATE = 0.05; // $20,000+ ("Level 2" contract)

// Kept as aliases so any existing imports/tests referencing the old names
// keep working — both now point at the $20,000+ tier.
export const BIF_DEPOSIT_CAP_THRESHOLD = DEPOSIT_CAP_UPPER_THRESHOLD;
export const BIF_DEPOSIT_CAP_RATE = DEPOSIT_CAP_UPPER_TIER_RATE;

export type DepositCapCheck = {
  /** True if the deposit exceeds the applicable statutory cap for this contract value. */
  breached: boolean;
  /** Deposit as a percentage of contract value, or null if either figure is missing. */
  percent: number | null;
  /** The cap rate that actually applies to this contract value (as a percentage, e.g. 10 or 5), or null if the Act doesn't apply (contract at or under $3,300). */
  capRate: number | null;
};

/**
 * QLD's domestic building contract deposit cap (QBCC Act Sch 1B, formerly
 * the standalone Domestic Building Contracts Act 2000) is tiered:
 *   - $3,300 or under: the Act doesn't apply (no written-contract
 *     requirement either) — not flagged.
 *   - $3,301–$19,999 ("Level 1"): capped at 10% of the contract price.
 *   - $20,000 and over ("Level 2"): capped at 5%.
 * (A separate 20% cap applies when >50% of the contract price is off-site
 * prefabrication work — not modelled here, since CivFlow doesn't currently
 * track that split; a builder in that situation should treat this check as
 * conservative, not authoritative.)
 */
export function checkDepositCap(contractValue: number | null, depositAmount: number | null): DepositCapCheck {
  if (typeof contractValue !== "number" || typeof depositAmount !== "number" || contractValue <= 0) {
    return { breached: false, percent: null, capRate: null };
  }
  const percent = (depositAmount / contractValue) * 100;

  if (contractValue <= DEPOSIT_CAP_LOWER_THRESHOLD) {
    return { breached: false, percent, capRate: null };
  }

  const capRate = contractValue > DEPOSIT_CAP_UPPER_THRESHOLD ? DEPOSIT_CAP_UPPER_TIER_RATE : DEPOSIT_CAP_LOWER_TIER_RATE;
  const breached = depositAmount / contractValue > capRate;
  return { breached, percent, capRate: capRate * 100 };
}

export type MarginInputs = {
  revisedContractValue: number;
  totalSubCommitted: number;
  totalMaterialsCost: number;
  totalLabourCost: number;
};

/**
 * Estimated margin = revised contract value (original + approved variations)
 * minus everything committed/spent so far (subcontractors, materials,
 * labour). Only meaningful once a contract value has actually been set —
 * callers should check that separately and pass null through rather than
 * showing a misleading $0.
 */
export function calculateEstimatedMargin(inputs: MarginInputs): number {
  const { revisedContractValue, totalSubCommitted, totalMaterialsCost, totalLabourCost } = inputs;
  return revisedContractValue - totalSubCommitted - totalMaterialsCost - totalLabourCost;
}

/** Margin as a percentage of revised contract value, or null if there's no
 * contract value to divide by. */
export function calculateMarginPercent(margin: number, revisedContractValue: number): number | null {
  if (revisedContractValue <= 0) return null;
  return Math.round((margin / revisedContractValue) * 100);
}

/** Percent of the (revised) contract value billed so far, capped at 100 for
 * display even if claims have technically overshot. */
export function calculatePercentBilled(totalClaimed: number, revisedContractValue: number): number | null {
  if (revisedContractValue <= 0) return null;
  return Math.min(100, Math.round((totalClaimed / revisedContractValue) * 100));
}
