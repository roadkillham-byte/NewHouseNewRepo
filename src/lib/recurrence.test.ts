import { describe, expect, it } from "vitest";
import {
  buildRRule,
  describeRule,
  expandRule,
  nextRoundRobinAssignee,
  parseRRuleToInput,
  validateRule,
} from "./recurrence";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const iso = (dates: Date[]) => dates.map((d) => d.toISOString().slice(0, 10));

describe("expandRule", () => {
  it("expands a weekly rule within a window", () => {
    const dates = expandRule(
      "FREQ=WEEKLY;BYDAY=MO",
      utc(2026, 1, 5), // a Monday
      utc(2026, 1, 1),
      utc(2026, 1, 31),
    );
    expect(iso(dates)).toEqual(["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"]);
  });

  it("crosses a month boundary correctly", () => {
    const dates = expandRule(
      "FREQ=WEEKLY;BYDAY=MO",
      utc(2026, 1, 5),
      utc(2026, 1, 26),
      utc(2026, 2, 9),
    );
    expect(iso(dates)).toEqual(["2026-01-26", "2026-02-02", "2026-02-09"]);
  });

  it("handles a leap-year February correctly", () => {
    // 2028 is a leap year: Feb has 29 days.
    const dates = expandRule(
      "FREQ=MONTHLY;BYMONTHDAY=29",
      utc(2028, 1, 29),
      utc(2028, 1, 1),
      utc(2028, 3, 1),
    );
    expect(iso(dates)).toEqual(["2028-01-29", "2028-02-29"]);
  });

  it("skips a monthly BYMONTHDAY=31 occurrence in short months", () => {
    const dates = expandRule(
      "FREQ=MONTHLY;BYMONTHDAY=31",
      utc(2026, 1, 31),
      utc(2026, 1, 1),
      utc(2026, 4, 30),
    );
    // Jan and Mar have 31 days; Feb and Apr don't, so RRULE produces no
    // occurrence for them rather than clamping to the last day.
    expect(iso(dates)).toEqual(["2026-01-31", "2026-03-31"]);
  });

  it("is unaffected by daylight saving transitions since dates are UTC-normalised", () => {
    // Australian DST ends the first Sunday of April. A weekly rule spanning
    // that boundary should still land on the same weekday every time.
    const dates = expandRule(
      "FREQ=WEEKLY;BYDAY=SU",
      utc(2026, 3, 22),
      utc(2026, 3, 22),
      utc(2026, 4, 12),
    );
    expect(iso(dates)).toEqual(["2026-03-22", "2026-03-29", "2026-04-05", "2026-04-12"]);
  });

  it("returns an empty array when the window has no occurrences", () => {
    const dates = expandRule(
      "FREQ=WEEKLY;BYDAY=MO",
      utc(2026, 1, 5),
      utc(2026, 1, 6),
      utc(2026, 1, 11),
    );
    expect(dates).toEqual([]);
  });

  it("throws when windowEnd precedes windowStart", () => {
    expect(() =>
      expandRule("FREQ=WEEKLY", utc(2026, 1, 1), utc(2026, 2, 1), utc(2026, 1, 1)),
    ).toThrow();
  });
});

describe("validateRule", () => {
  it("accepts a well-formed rule", () => {
    expect(() => validateRule("FREQ=WEEKLY;BYDAY=MO,WE,FR")).not.toThrow();
  });

  it("throws on a malformed rule", () => {
    expect(() => validateRule("NOT_AN_RRULE")).toThrow();
  });
});

describe("describeRule", () => {
  it("produces a human-readable description", () => {
    const text = describeRule("FREQ=WEEKLY;BYDAY=MO", utc(2026, 1, 5));
    expect(text.toLowerCase()).toContain("week");
  });
});

describe("nextRoundRobinAssignee", () => {
  const members = [
    { id: "a", active: true },
    { id: "b", active: true },
    { id: "c", active: true },
    { id: "d", active: true },
  ];

  it("assigns the first member when there is no history", () => {
    expect(nextRoundRobinAssignee(members, null)).toBe("a");
  });

  it("cycles to the next member in order", () => {
    expect(nextRoundRobinAssignee(members, "a")).toBe("b");
    expect(nextRoundRobinAssignee(members, "b")).toBe("c");
    expect(nextRoundRobinAssignee(members, "c")).toBe("d");
  });

  it("wraps around from the last member back to the first", () => {
    expect(nextRoundRobinAssignee(members, "d")).toBe("a");
  });

  it("skips an inactive member without breaking the cycle", () => {
    const withInactive = [
      { id: "a", active: true },
      { id: "b", active: false },
      { id: "c", active: true },
    ];
    expect(nextRoundRobinAssignee(withInactive, "a")).toBe("c");
  });

  it("falls back to the front when the last assignee has left the household", () => {
    expect(nextRoundRobinAssignee(members, "no-longer-a-member")).toBe("a");
  });

  it("throws when there are no active members at all", () => {
    const allInactive = [
      { id: "a", active: false },
      { id: "b", active: false },
    ];
    expect(() => nextRoundRobinAssignee(allInactive, null)).toThrow();
  });

  it("stays fair over 100 cycles, redistributing correctly when a member is deactivated mid-run", () => {
    let roster = [
      { id: "a", active: true },
      { id: "b", active: true },
      { id: "c", active: true },
      { id: "d", active: true },
    ];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    let last: string | null = null;

    for (let i = 0; i < 100; i++) {
      // Deactivate "c" halfway through — simulates a housemate moving out.
      if (i === 50) {
        roster = roster.map((m) => (m.id === "c" ? { ...m, active: false } : m));
      }
      const next = nextRoundRobinAssignee(roster, last);
      counts[next] += 1;
      last = next;
    }

    // "c" only participated in the first half, so should have roughly half
    // the turns of the members active the whole time.
    expect(counts.c).toBeGreaterThan(0);
    expect(counts.c).toBeLessThan(counts.a);
    // The three always-active members should be within one turn of each
    // other — no one is structurally favoured by the rotation.
    const activeCounts = [counts.a, counts.b, counts.d];
    expect(Math.max(...activeCounts) - Math.min(...activeCounts)).toBeLessThanOrEqual(1);
    // No turns are lost: total assignments still equals the number of cycles.
    expect(Object.values(counts).reduce((s, n) => s + n, 0)).toBe(100);
  });
});

describe("buildRRule", () => {
  it("returns null for a one-off task", () => {
    expect(buildRRule({ frequency: "once" })).toBeNull();
  });

  it("builds a daily rule with a default interval of 1", () => {
    expect(buildRRule({ frequency: "daily" })).toBe("RRULE:FREQ=DAILY;INTERVAL=1");
  });

  it("builds an every-N-days rule", () => {
    expect(buildRRule({ frequency: "daily", interval: 3 })).toBe("RRULE:FREQ=DAILY;INTERVAL=3");
  });

  it("builds a weekly rule with specific days", () => {
    // Monday (0) and Wednesday (2)
    const rule = buildRRule({ frequency: "weekly", daysOfWeek: [0, 2] });
    expect(rule).toBe("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE");
  });

  it("builds a fortnightly rule", () => {
    const rule = buildRRule({ frequency: "weekly", interval: 2, daysOfWeek: [4] });
    expect(rule).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=FR");
  });

  it("builds a monthly rule on a specific day", () => {
    const rule = buildRRule({ frequency: "monthly", dayOfMonth: 15 });
    expect(rule).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15");
  });

  it("throws for weekly with no days selected", () => {
    expect(() => buildRRule({ frequency: "weekly", daysOfWeek: [] })).toThrow();
  });

  it("throws for monthly with an out-of-range day", () => {
    expect(() => buildRRule({ frequency: "monthly", dayOfMonth: 32 })).toThrow();
    expect(() => buildRRule({ frequency: "monthly", dayOfMonth: 0 })).toThrow();
  });

  it("produces a string expandRule can actually use", () => {
    const rule = buildRRule({ frequency: "weekly", daysOfWeek: [0] });
    expect(rule).not.toBeNull();
    const dates = expandRule(rule as string, utc(2026, 1, 5), utc(2026, 1, 1), utc(2026, 1, 31));
    expect(iso(dates)).toEqual(["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"]);
  });
});

describe("parseRRuleToInput", () => {
  it("round-trips a one-off task", () => {
    expect(parseRRuleToInput(null)).toEqual({ frequency: "once" });
  });

  it("round-trips a daily rule", () => {
    const rule = buildRRule({ frequency: "daily", interval: 2 });
    expect(parseRRuleToInput(rule)).toEqual({ frequency: "daily", interval: 2 });
  });

  it("round-trips a weekly rule with multiple days", () => {
    const input = { frequency: "weekly" as const, interval: 1, daysOfWeek: [0, 2, 4] };
    const rule = buildRRule(input);
    expect(parseRRuleToInput(rule)).toEqual(input);
  });

  it("round-trips a monthly rule", () => {
    const input = { frequency: "monthly" as const, interval: 1, dayOfMonth: 1 };
    const rule = buildRRule(input);
    expect(parseRRuleToInput(rule)).toEqual(input);
  });

  it("round-trips a fortnightly rule", () => {
    const input = { frequency: "weekly" as const, interval: 2, daysOfWeek: [5] };
    const rule = buildRRule(input);
    expect(parseRRuleToInput(rule)).toEqual(input);
  });
});
