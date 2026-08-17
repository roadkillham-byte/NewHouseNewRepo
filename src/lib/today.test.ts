import { describe, expect, it } from "vitest";
import { addUtcDays, houseToday, startOfUtcDay } from "./today";

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("houseToday", () => {
  it("returns the household's local date, not the server's UTC date", () => {
    // 8am Tuesday 18 Aug in Sydney is 10pm Monday 17 Aug UTC. The house
    // is living on Tuesday, so that's the date the app must use.
    const morningInSydney = new Date("2026-08-18T08:00:00+10:00");
    expect(iso(houseToday(morningInSydney, "Australia/Sydney"))).toBe("2026-08-18");
    // The naive UTC reading is the bug this function exists to prevent.
    expect(iso(startOfUtcDay(morningInSydney))).toBe("2026-08-17");
  });

  it("agrees with UTC when the house is in UTC", () => {
    const moment = new Date("2026-08-18T08:00:00Z");
    expect(iso(houseToday(moment, "UTC"))).toBe("2026-08-18");
  });

  it("handles late evening, when local is a day ahead of UTC", () => {
    // 11:30pm Sydney on the 18th = 1:30pm UTC on the 18th — same date here.
    const lateEvening = new Date("2026-08-18T23:30:00+10:00");
    expect(iso(houseToday(lateEvening, "Australia/Sydney"))).toBe("2026-08-18");
  });

  it("handles just after local midnight, the worst case for the UTC bug", () => {
    // 00:05 Sydney on the 18th = 14:05 UTC on the 17th.
    const justAfterMidnight = new Date("2026-08-18T00:05:00+10:00");
    expect(iso(houseToday(justAfterMidnight, "Australia/Sydney"))).toBe("2026-08-18");
    expect(iso(startOfUtcDay(justAfterMidnight))).toBe("2026-08-17");
  });

  it("handles a timezone behind UTC", () => {
    // 8pm on the 17th in Los Angeles is 3am on the 18th UTC.
    const eveningInLA = new Date("2026-08-17T20:00:00-07:00");
    expect(iso(houseToday(eveningInLA, "America/Los_Angeles"))).toBe("2026-08-17");
    expect(iso(startOfUtcDay(eveningInLA))).toBe("2026-08-18");
  });

  it("tracks daylight saving: the same wall-clock hour either side of the AEDT switch", () => {
    // AEDT (UTC+11) in January.
    const summer = new Date("2026-01-15T09:00:00+11:00");
    expect(iso(houseToday(summer, "Australia/Sydney"))).toBe("2026-01-15");
    // AEST (UTC+10) in July.
    const winter = new Date("2026-07-15T09:00:00+10:00");
    expect(iso(houseToday(winter, "Australia/Sydney"))).toBe("2026-07-15");
  });

  it("always returns a UTC-midnight value, so it compares cleanly against date columns", () => {
    const result = houseToday(new Date("2026-08-18T08:00:00+10:00"), "Australia/Sydney");
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });
});

describe("addUtcDays", () => {
  it("adds days", () => {
    expect(iso(addUtcDays(new Date(Date.UTC(2026, 7, 17)), 3))).toBe("2026-08-20");
  });

  it("subtracts with a negative value", () => {
    expect(iso(addUtcDays(new Date(Date.UTC(2026, 7, 17)), -3))).toBe("2026-08-14");
  });

  it("rolls over a month boundary", () => {
    expect(iso(addUtcDays(new Date(Date.UTC(2026, 7, 30)), 5))).toBe("2026-09-04");
  });

  it("does not mutate its argument", () => {
    const original = new Date(Date.UTC(2026, 7, 17));
    addUtcDays(original, 10);
    expect(iso(original)).toBe("2026-08-17");
  });
});
