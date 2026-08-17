import { describe, expect, it } from "vitest";
import { computeBudgetRollup, HOUSE_TOTAL_KEY, type BudgetInputItem } from "./budget";

function item(overrides: Partial<BudgetInputItem>): BudgetInputItem {
  return {
    room: null,
    status: "needed",
    estimatedCents: null,
    actualCents: null,
    ...overrides,
  };
}

describe("computeBudgetRollup", () => {
  it("returns an empty list for no items", () => {
    expect(computeBudgetRollup([])).toEqual([]);
  });

  it("puts the house-wide total first", () => {
    const result = computeBudgetRollup([item({ room: "Kitchen", estimatedCents: 5000 })]);
    expect(result[0].room).toBe(HOUSE_TOTAL_KEY);
  });

  it("counts owned items against actual spend and everything else against estimate", () => {
    const result = computeBudgetRollup([
      item({ room: "Lounge", status: "owned", actualCents: 80000 }),
      item({ room: "Lounge", status: "needed", estimatedCents: 20000 }),
      item({ room: "Lounge", status: "researching", estimatedCents: 15000 }),
      item({ room: "Lounge", status: "ordered", estimatedCents: 5000 }),
    ]);
    const lounge = result.find((r) => r.room === "Lounge");
    expect(lounge?.ownedCount).toBe(1);
    expect(lounge?.actualCents).toBe(80000);
    // needed + researching + ordered all count as "still to buy"
    expect(lounge?.neededCount).toBe(3);
    expect(lounge?.estimatedCents).toBe(40000);
  });

  it("sums the house total across every room", () => {
    const result = computeBudgetRollup([
      item({ room: "Kitchen", status: "owned", actualCents: 30000 }),
      item({ room: "Bedroom", status: "owned", actualCents: 45000 }),
      item({ room: "Kitchen", status: "needed", estimatedCents: 10000 }),
    ]);
    const house = result.find((r) => r.room === HOUSE_TOTAL_KEY);
    expect(house?.actualCents).toBe(75000);
    expect(house?.estimatedCents).toBe(10000);
    expect(house?.ownedCount).toBe(2);
    expect(house?.neededCount).toBe(1);
  });

  it("groups items with no room under 'Unassigned'", () => {
    const result = computeBudgetRollup([item({ room: null, estimatedCents: 1000 })]);
    expect(result.some((r) => r.room === "Unassigned")).toBe(true);
  });

  it("treats null prices as zero rather than NaN", () => {
    const result = computeBudgetRollup([
      item({ room: "Hall", status: "owned", actualCents: null }),
      item({ room: "Hall", status: "needed", estimatedCents: null }),
    ]);
    const hall = result.find((r) => r.room === "Hall");
    expect(hall?.actualCents).toBe(0);
    expect(hall?.estimatedCents).toBe(0);
  });

  it("sorts rooms alphabetically after the house row", () => {
    const result = computeBudgetRollup([
      item({ room: "Zebra room" }),
      item({ room: "Attic" }),
      item({ room: "Mudroom" }),
    ]);
    expect(result.map((r) => r.room)).toEqual([HOUSE_TOTAL_KEY, "Attic", "Mudroom", "Zebra room"]);
  });
});
