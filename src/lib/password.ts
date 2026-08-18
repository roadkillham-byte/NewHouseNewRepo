import { randomInt } from "node:crypto";

/**
 * Password generation and strength rules.
 *
 * A new housemate's account is created by someone already in the house, so
 * the app generates a temporary password for them to be told out loud or
 * over a message — which is exactly why the alphabet below excludes
 * characters people misread or mishear.
 */

// No 0/O, 1/l/I, 5/S, 2/Z, 8/B — the pairs that get misread when someone
// reads a password aloud or copies it off a screen.
const ALPHABET = "abcdefghijkmnpqrtuvwxyzACDEFGHJKLMNPQRTUVWXY34679";
const TEMP_PASSWORD_LENGTH = 14;

export const MIN_PASSWORD_LENGTH = 10;

/**
 * A cryptographically random temporary password. Uses randomInt (rejection
 * sampling under the hood) rather than `Math.random()` or a modulo of
 * randomBytes, both of which bias the distribution.
 */
export function generateTempPassword(length: number = TEMP_PASSWORD_LENGTH): string {
  if (length < MIN_PASSWORD_LENGTH) {
    throw new Error(`generateTempPassword: length must be at least ${MIN_PASSWORD_LENGTH}`);
  }
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/**
 * The handful of passwords people actually pick when told to pick one.
 * A full breach corpus would need a service; this catches the realistic
 * cases for a four-person house without pretending to be more.
 */
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "letmein123",
  "iloveyou1",
  "welcome123",
  "admin12345",
  "housemate1",
  "changeme123",
]);

export interface PasswordCheck {
  ok: boolean;
  /** Present when ok is false — safe to show directly to the user. */
  message?: string;
}

/** Validates a user-chosen password. Deliberately permissive on composition, strict on length and obviousness. */
export function validatePasswordStrength(password: string): PasswordCheck {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Use at least ${MIN_PASSWORD_LENGTH} characters — length matters more than symbols.`,
    };
  }
  if (password.length > 200) {
    return { ok: false, message: "That's longer than 200 characters." };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, message: "That's one of the most commonly used passwords. Pick another." };
  }
  if (/^(.)\1+$/.test(password)) {
    return { ok: false, message: "That's the same character repeated. Pick another." };
  }
  return { ok: true };
}
