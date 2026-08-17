/**
 * Splits a bill period's total across members. Always works in integer
 * cents and always distributes every last cent — the returned amounts sum
 * exactly to `totalCents`, with any remainder from integer division handed
 * to the first N members rather than lost or invented.
 */

export interface SplitShare {
  memberId: string;
  amountCents: number;
}

/**
 * Even split across the given members. A $10.00 bill across 3 people
 * produces 334/333/333 cents, not 333/333/333 (which would lose a cent) or
 * 334/334/334 (which would invent one).
 */
export function splitEven(totalCents: number, memberIds: string[]): SplitShare[] {
  if (memberIds.length === 0) {
    throw new Error("splitEven: no members to split across");
  }
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error(`splitEven: totalCents must be a non-negative integer, got ${totalCents}`);
  }

  const base = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents - base * memberIds.length;

  return memberIds.map((memberId, index) => ({
    memberId,
    // The first `remainder` members absorb the extra cent each.
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}

/**
 * Split by weighted shares, e.g. a couple in one room paying 1.5x a solo
 * room. `shares` maps memberId -> weight (any positive number; weights need
 * not sum to 1). Remainder cents (from rounding down each member's exact
 * share) go to the members with the largest fractional remainder first —
 * the "largest remainder method" — so the split stays as fair as integer
 * cents allow.
 */
export function splitByShares(
  totalCents: number,
  shares: Record<string, number>,
): SplitShare[] {
  const memberIds = Object.keys(shares);
  if (memberIds.length === 0) {
    throw new Error("splitByShares: no members to split across");
  }
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error(`splitByShares: totalCents must be a non-negative integer, got ${totalCents}`);
  }

  const totalWeight = memberIds.reduce((sum, id) => sum + shares[id], 0);
  if (totalWeight <= 0) {
    throw new Error("splitByShares: total weight must be positive");
  }

  const exact = memberIds.map((memberId) => {
    const raw = (totalCents * shares[memberId]) / totalWeight;
    return { memberId, floor: Math.floor(raw), remainder: raw - Math.floor(raw) };
  });

  const distributed = exact.reduce((sum, e) => sum + e.floor, 0);
  const leftover = totalCents - distributed;

  // Largest remainder first gets the leftover cents.
  const byRemainderDesc = [...exact].sort((a, b) => b.remainder - a.remainder);
  const bonusMemberIds = new Set(byRemainderDesc.slice(0, leftover).map((e) => e.memberId));

  return exact.map(({ memberId, floor }) => ({
    memberId,
    amountCents: floor + (bonusMemberIds.has(memberId) ? 1 : 0),
  }));
}

/**
 * A custom split supplied directly by a user (e.g. "Alex pays $40, everyone
 * else splits the rest evenly"). Validates that the shares sum exactly to
 * the total — callers should catch this and surface it as a form error
 * rather than silently accepting a mismatched split.
 */
export function assertSplitSumsToTotal(shares: SplitShare[], totalCents: number): void {
  const sum = shares.reduce((total, s) => total + s.amountCents, 0);
  if (sum !== totalCents) {
    throw new Error(
      `Split shares sum to ${sum} cents but the bill total is ${totalCents} cents`,
    );
  }
}
