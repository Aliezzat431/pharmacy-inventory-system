import crypto from "crypto";
import bcrypt from "bcrypt";

const BCRYPT_PREFIXES = ["$2a$", "$2b$", "$2y$"];

export function isBcryptHash(stored) {
  if (!stored || typeof stored !== "string") return false;
  return BCRYPT_PREFIXES.some((p) => stored.startsWith(p));
}

/**
 * Verify password against stored value: bcrypt hashes, or legacy plaintext (timing-safe when lengths match).
 */
export async function verifyStoredPassword(plain, stored) {
  if (plain == null || stored == null) return false;
  if (typeof plain !== "string" || typeof stored !== "string") return false;

  if (isBcryptHash(stored)) {
    try {
      return await bcrypt.compare(plain, stored);
    } catch {
      return false;
    }
  }

  try {
    const a = Buffer.from(plain, "utf8");
    const b = Buffer.from(stored, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function hashPasswordForStorage(plain) {
  return bcrypt.hash(plain, 12);
}

/** Constant-time string compare (UTF-8); false if lengths differ. */
export function timingSafeEqualStrings(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
