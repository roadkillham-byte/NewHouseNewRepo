import { describe, expect, it } from "vitest";
import {
  computeNetPositions,
  computeTransfers,
  type LedgerParticipant,
} from "./settlement";

const p = (memberId: string, name: string, paidCents: number): LedgerParticipant => ({
  memberId,
  name,
  paidCents,
});

describe("computeNetPositions", () => {
  it("returns nothing for no participants", () => {
    expect(computeNetPositions([])).toEqual([]);
  });

  it("gives everyone a zero net when everyone paid the same", () => {
    const positions = computeNetPositions([p("a", "A", 5000), p("b", "B", 5000)]);
    expect(positions.every((x) => x.netCents === 0)).toBe(true);
  });

  it("computes who is up and who is down", () => {
    // A paid everything; 2 people, so each should have paid 50.
    const positions = computeNetPositions([p("a", "A", 10000), p("b", "B", 0)]);
    expect(positions[0].netCents).toBe(5000);
    expect(positions[1].netCents).toBe(-5000);
  });

  it("always nets to exactly zero, including with awkward remainders", () => {
    // 3 people, $10.00 total: fair shares are 334/333/333.
    const positions = computeNetPositions([p("a", "A", 1000), p("b", "B", 0), p("c", "C", 0)]);
    expect(positions.reduce((sum, x) => sum + x.netCents, 0)).toBe(0);
    expect(positions.map((x) => x.fairShareCents)).toEqual([334, 333, 333]);
  });

  it("nets to zero across many random-ish splits", () => {
    for (let total = 1; total < 400; total += 13) {
      for (let n = 1; n <= 5; n++) {
        const participants = Array.from({ length: n }, (_, i) =>
          p(`m${i}`, `M${i}`, i === 0 ? total : 0),
        );
        const positions = computeNetPositions(participants);
        expect(positions.reduce((sum, x) => sum + x.netCents, 0)).toBe(0);
      }
    }
  });
});

describe("computeTransfers", () => {
  it("produces no transfers when everyone is square", () => {
    const positions = computeNetPositions([p("a", "A", 5000), p("b", "B", 5000)]);
    expect(computeTransfers(positions)).toEqual([]);
  });

  it("produces one transfer for a simple two-person debt", () => {
    const positions = computeNetPositions([p("a", "A", 10000), p("b", "B", 0)]);
    const transfers = computeTransfers(positions);
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toMatchObject({ fromMemberId: "b", toMemberId: "a", amountCents: 5000 });
  });

  it("settles a four-person house in at most n-1 transfers", () => {
    const positions = computeNetPositions([
      p("a", "A", 40000),
      p("b", "B", 0),
      p("c", "C", 0),
      p("d", "D", 0),
    ]);
    const transfers = computeTransfers(positions);
    expect(transfers.length).toBeLessThanOrEqual(3);
  });

  it("transfers always balance the books — every net returns to zero", () => {
    const positions = computeNetPositions([
      p("a", "A", 12000),
      p("b", "B", 3000),
      p("c", "C", 9000),
      p("d", "D", 0),
    ]);
    const transfers = computeTransfers(positions);

    const applied = new Map(positions.map((x) => [x.memberId, x.netCents]));
    for (const t of transfers) {
      applied.set(t.fromMemberId, (applied.get(t.fromMemberId) ?? 0) + t.amountCents);
      applied.set(t.toMemberId, (applied.get(t.toMemberId) ?? 0) - t.amountCents);
    }
    // After settling, everyone should be at (or within a cent of) zero.
    for (const net of applied.values()) {
      expect(Math.abs(net)).toBeLessThanOrEqual(1);
    }
  });

  it("never asks anyone to pay themselves", () => {
    const positions = computeNetPositions([
      p("a", "A", 7000),
      p("b", "B", 1000),
      p("c", "C", 4000),
    ]);
    const transfers = computeTransfers(positions);
    expect(transfers.every((t) => t.fromMemberId !== t.toMemberId)).toBe(true);
  });

  it("ignores sub-tolerance rounding residue instead of emitting a 1c transfer", () => {
    // 3 people, $10.00, one payer: nets are +666/-333/-333 -> real transfers,
    // but the leftover cent must not spawn an extra line.
    const positions = computeNetPositions([p("a", "A", 1000), p("b", "B", 0), p("c", "C", 0)]);
    const transfers = computeTransfers(positions);
    expect(transfers).toHaveLength(2);
    expect(transfers.every((t) => t.amountCents > 1)).toBe(true);
  });

  it("produces only positive amounts", () => {
    const positions = computeNetPositions([
      p("a", "A", 500),
      p("b", "B", 12345),
      p("c", "C", 60),
    ]);
    expect(computeTransfers(positions).every((t) => t.amountCents > 0)).toBe(true);
  });
});
