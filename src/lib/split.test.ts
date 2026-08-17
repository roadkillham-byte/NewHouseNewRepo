import { describe, expect, it } from "vitest";
import { assertSplitSumsToTotal, splitByShares, splitEven } from "./split";

describe("splitEven", () => {
  it("splits evenly when it divides cleanly", () => {
    const shares = splitEven(9000, ["a", "b", "c"]);
    expect(shares.map((s) => s.amountCents)).toEqual([3000, 3000, 3000]);
  });

  it("gives the remainder cents to the first members, never losing or inventing a cent", () => {
    // $10.00 across 3 people: 334/333/333, not 333/333/333 (loses 1c) or
    // 334/334/334 (invents 2c).
    const shares = splitEven(1000, ["a", "b", "c"]);
    expect(shares.map((s) => s.amountCents)).toEqual([334, 333, 333]);
    expect(shares.reduce((sum, s) => sum + s.amountCents, 0)).toBe(1000);
  });

  it("sums exactly to the total across many odd totals and group sizes", () => {
    for (let total = 1; total < 500; total += 7) {
      for (let n = 1; n <= 6; n++) {
        const memberIds = Array.from({ length: n }, (_, i) => `m${i}`);
        const shares = splitEven(total, memberIds);
        const sum = shares.reduce((s, share) => s + share.amountCents, 0);
        expect(sum).toBe(total);
      }
    }
  });

  it("handles a single member", () => {
    expect(splitEven(1234, ["solo"])).toEqual([{ memberId: "solo", amountCents: 1234 }]);
  });

  it("handles a zero total", () => {
    expect(splitEven(0, ["a", "b"])).toEqual([
      { memberId: "a", amountCents: 0 },
      { memberId: "b", amountCents: 0 },
    ]);
  });

  it("throws on an empty member list", () => {
    expect(() => splitEven(1000, [])).toThrow();
  });

  it("throws on a negative or non-integer total", () => {
    expect(() => splitEven(-100, ["a"])).toThrow();
    expect(() => splitEven(10.5, ["a"])).toThrow();
  });
});

describe("splitByShares", () => {
  it("splits proportionally to weights", () => {
    // A couple (weight 2) and a solo housemate (weight 1) split $30.00.
    const shares = splitByShares(3000, { couple: 2, solo: 1 });
    const byId = Object.fromEntries(shares.map((s) => [s.memberId, s.amountCents]));
    expect(byId.couple).toBe(2000);
    expect(byId.solo).toBe(1000);
  });

  it("sums exactly to the total even with rounding", () => {
    const shares = splitByShares(1000, { a: 1, b: 1, c: 1 });
    const sum = shares.reduce((s, share) => s + share.amountCents, 0);
    expect(sum).toBe(1000);
  });

  it("gives leftover cents to the largest remainders", () => {
    // 1000 / 3 shares = 333.33 each -> 333/333/333 with 1 cent left over,
    // handed to whichever member has the largest fractional remainder. All
    // three have an identical remainder here, so the first in iteration
    // order (object key order) gets it.
    const shares = splitByShares(1000, { a: 1, b: 1, c: 1 });
    const sum = shares.reduce((s, share) => s + share.amountCents, 0);
    expect(sum).toBe(1000);
    expect(shares.filter((s) => s.amountCents === 334)).toHaveLength(1);
    expect(shares.filter((s) => s.amountCents === 333)).toHaveLength(2);
  });

  it("throws on empty shares or non-positive total weight", () => {
    expect(() => splitByShares(1000, {})).toThrow();
    expect(() => splitByShares(1000, { a: 0, b: 0 })).toThrow();
  });
});

describe("assertSplitSumsToTotal", () => {
  it("passes when shares sum to the total", () => {
    expect(() =>
      assertSplitSumsToTotal(
        [
          { memberId: "a", amountCents: 400 },
          { memberId: "b", amountCents: 600 },
        ],
        1000,
      ),
    ).not.toThrow();
  });

  it("throws when shares don't sum to the total", () => {
    expect(() =>
      assertSplitSumsToTotal(
        [
          { memberId: "a", amountCents: 400 },
          { memberId: "b", amountCents: 500 },
        ],
        1000,
      ),
    ).toThrow();
  });
});
