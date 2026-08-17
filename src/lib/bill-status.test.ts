import { describe, expect, it } from "vitest";
import { computeBillPeriodStatus } from "./bill-status";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("computeBillPeriodStatus", () => {
  const today = utc(2026, 6, 15);

  it("is settled when every share is paid, regardless of due date", () => {
    const shares = [{ paidAt: utc(2026, 6, 1) }, { paidAt: utc(2026, 6, 2) }];
    expect(computeBillPeriodStatus(utc(2026, 5, 1), today, shares)).toBe("settled");
    expect(computeBillPeriodStatus(utc(2026, 7, 1), today, shares)).toBe("settled");
  });

  it("is not settled when shares exist but none are paid", () => {
    const shares = [{ paidAt: null }, { paidAt: null }];
    expect(computeBillPeriodStatus(utc(2026, 6, 15), today, shares)).not.toBe("settled");
  });

  it("is not settled when only some shares are paid", () => {
    const shares = [{ paidAt: utc(2026, 6, 1) }, { paidAt: null }];
    expect(computeBillPeriodStatus(utc(2026, 6, 15), today, shares)).not.toBe("settled");
  });

  it("treats a period with zero shares as not settled (nothing to be paid yet)", () => {
    expect(computeBillPeriodStatus(utc(2026, 6, 15), today, [])).not.toBe("settled");
  });

  it("is overdue when the due date has passed and it isn't fully paid", () => {
    const shares = [{ paidAt: null }];
    expect(computeBillPeriodStatus(utc(2026, 6, 10), today, shares)).toBe("overdue");
  });

  it("is due_today when the due date is today and it isn't fully paid", () => {
    const shares = [{ paidAt: null }];
    expect(computeBillPeriodStatus(utc(2026, 6, 15), today, shares)).toBe("due_today");
  });

  it("is upcoming when the due date is in the future", () => {
    const shares = [{ paidAt: null }];
    expect(computeBillPeriodStatus(utc(2026, 6, 20), today, shares)).toBe("upcoming");
  });
});
