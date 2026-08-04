import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const PASSLIB_PBKDF2_SHA256_PREFIX = "$pbkdf2-sha256$";
const DEFAULT_ROUNDS = 29000;
const SALT_SIZE = 16;

function decodePasslibBase64(value: string): Buffer {
  const padded = value.replace(/\./g, "+").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function encodePasslibBase64(value: Buffer): string {
  return value.toString("base64").replace(/\+/g, ".").replace(/=+$/g, "");
}

export function verifyPasslibPbkdf2Sha256(plainPassword: string, passwordHash: string): boolean {
  const parts = passwordHash.split("$");

  if (parts.length !== 5 || passwordHash.startsWith(PASSLIB_PBKDF2_SHA256_PREFIX) === false) {
    return false;
  }

  const rounds = Number(parts[2]);
  if (!Number.isInteger(rounds) || rounds <= 0) {
    return false;
  }

  try {
    const salt = decodePasslibBase64(parts[3]);
    const expectedDigest = decodePasslibBase64(parts[4]);
    const actualDigest = pbkdf2Sync(plainPassword, salt, rounds, expectedDigest.length, "sha256");

    return actualDigest.length === expectedDigest.length && timingSafeEqual(actualDigest, expectedDigest);
  }
  catch {
    return false;
  }
}

export function verifyDocumentUserPasswordHash(plainPassword: string, passwordHash: string): boolean {
  return verifyPasslibPbkdf2Sha256(plainPassword, passwordHash);
}

export function hashPasslibPbkdf2Sha256(password: string): string {
  const salt = randomBytes(SALT_SIZE);
  const digest = pbkdf2Sync(password, salt, DEFAULT_ROUNDS, 32, "sha256");

  return `${PASSLIB_PBKDF2_SHA256_PREFIX}${DEFAULT_ROUNDS}$${encodePasslibBase64(salt)}$${encodePasslibBase64(digest)}`;
}
