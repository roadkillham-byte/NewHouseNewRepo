import { describe, expect, it } from "vitest";
import { isDatabaseUnreachable } from "./db-errors";

describe("isDatabaseUnreachable", () => {
  it("recognises a refused connection", () => {
    expect(isDatabaseUnreachable(Object.assign(new Error("x"), { code: "ECONNREFUSED" }))).toBe(true);
  });

  it("recognises Postgres saying it cannot accept connections yet", () => {
    // 57P03 is what a Supabase project returns while it wakes up.
    expect(isDatabaseUnreachable(Object.assign(new Error("x"), { code: "57P03" }))).toBe(true);
  });

  it("recognises a connection failure reported only in the message", () => {
    expect(isDatabaseUnreachable(new Error("connect ECONNREFUSED 127.0.0.1:5432"))).toBe(true);
    expect(isDatabaseUnreachable(new Error("Connection terminated unexpectedly"))).toBe(true);
  });

  it("unwraps a nested cause", () => {
    const inner = Object.assign(new Error("socket"), { code: "ETIMEDOUT" });
    expect(isDatabaseUnreachable(new Error("query failed", { cause: inner }))).toBe(true);
  });

  it("does not mistake an ordinary application error for a connection failure", () => {
    expect(isDatabaseUnreachable(new Error("Not signed in."))).toBe(false);
    expect(isDatabaseUnreachable(new Error("Invalid amount"))).toBe(false);
  });

  it("does not mistake a constraint violation for a connection failure", () => {
    // 23505 = unique_violation: the database is very much reachable.
    expect(isDatabaseUnreachable(Object.assign(new Error("dupe"), { code: "23505" }))).toBe(false);
  });

  it("handles null and non-objects", () => {
    expect(isDatabaseUnreachable(null)).toBe(false);
    expect(isDatabaseUnreachable(undefined)).toBe(false);
    expect(isDatabaseUnreachable("boom")).toBe(false);
  });

  it("does not loop forever on a self-referencing cause", () => {
    const e = new Error("loop") as Error & { cause?: unknown };
    e.cause = e;
    expect(isDatabaseUnreachable(e)).toBe(false);
  });
});
