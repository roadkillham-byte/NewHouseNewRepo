import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney, sumCents } from "./money";

describe("formatMoney", () => {
  it("formats whole dollars", () => {
    expect(formatMoney(129900)).toBe("$1,299.00");
  });

  it("formats cents", () => {
    expect(formatMoney(150)).toBe("$1.50");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("throws on non-finite input", () => {
    expect(() => formatMoney(NaN)).toThrow();
    expect(() => formatMoney(Infinity)).toThrow();
  });
});

describe("parseMoney", () => {
  it("parses a plain amount", () => {
    expect(parseMoney("12.50")).toBe(1250);
  });

  it("parses a dollar sign and thousands separators", () => {
    expect(parseMoney("$1,299.00")).toBe(129900);
  });

  it("parses a whole-dollar amount with no decimal", () => {
    expect(parseMoney("40")).toBe(4000);
  });

  it("parses a single decimal place", () => {
    expect(parseMoney("40.5")).toBe(4050);
  });

  it("rejects negative amounts", () => {
    expect(() => parseMoney("-5.00")).toThrow();
  });

  it("rejects more than two decimal places", () => {
    expect(() => parseMoney("5.001")).toThrow();
  });

  it("rejects garbage input", () => {
    expect(() => parseMoney("not a number")).toThrow();
  });

  it("round-trips through formatMoney", () => {
    const cents = parseMoney("1,234.56");
    expect(formatMoney(cents)).toBe("$1,234.56");
  });
});

describe("sumCents", () => {
  it("sums an array of cents", () => {
    expect(sumCents([100, 200, 333])).toBe(633);
  });

  it("returns 0 for an empty array", () => {
    expect(sumCents([])).toBe(0);
  });
});
