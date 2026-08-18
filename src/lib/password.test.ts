import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  generateTempPassword,
  validatePasswordStrength,
} from "./password";

describe("generateTempPassword", () => {
  it("produces a password of the requested length", () => {
    expect(generateTempPassword(14)).toHaveLength(14);
    expect(generateTempPassword(20)).toHaveLength(20);
  });

  it("defaults to a length that passes its own strength check", () => {
    const pw = generateTempPassword();
    expect(pw.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
    expect(validatePasswordStrength(pw).ok).toBe(true);
  });

  it("refuses to generate something shorter than the minimum", () => {
    expect(() => generateTempPassword(4)).toThrow();
  });

  it("omits characters that get misread when a password is read aloud", () => {
    // 200 samples is plenty to catch an ambiguous character in the alphabet.
    const all = Array.from({ length: 200 }, () => generateTempPassword()).join("");
    for (const ambiguous of ["0", "O", "1", "l", "I", "5", "S", "2", "Z", "8", "B"]) {
      expect(all).not.toContain(ambiguous);
    }
  });

  it("does not repeat itself", () => {
    const seen = new Set(Array.from({ length: 100 }, () => generateTempPassword()));
    expect(seen.size).toBe(100);
  });

  it("uses a reasonable spread of the alphabet rather than a few characters", () => {
    const sample = Array.from({ length: 100 }, () => generateTempPassword()).join("");
    expect(new Set(sample).size).toBeGreaterThan(30);
  });
});

describe("validatePasswordStrength", () => {
  it("accepts a decent password", () => {
    expect(validatePasswordStrength("correct horse battery").ok).toBe(true);
  });

  it("rejects anything under the minimum length", () => {
    const result = validatePasswordStrength("short1");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/at least/i);
  });

  it("accepts exactly the minimum length", () => {
    expect(validatePasswordStrength("a".repeat(MIN_PASSWORD_LENGTH - 1) + "b").ok).toBe(true);
  });

  it("rejects common passwords regardless of case", () => {
    expect(validatePasswordStrength("password123").ok).toBe(false);
    expect(validatePasswordStrength("PASSWORD123").ok).toBe(false);
  });

  it("rejects a single repeated character", () => {
    expect(validatePasswordStrength("aaaaaaaaaaaa").ok).toBe(false);
  });

  it("rejects absurdly long input", () => {
    expect(validatePasswordStrength("a".repeat(500)).ok).toBe(false);
  });

  it("does not require symbols or mixed case — length is what matters", () => {
    expect(validatePasswordStrength("thequickbrownfox").ok).toBe(true);
  });
});
