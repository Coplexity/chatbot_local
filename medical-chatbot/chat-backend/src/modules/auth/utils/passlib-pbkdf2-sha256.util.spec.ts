import { hashPasslibPbkdf2Sha256, verifyDocumentUserPasswordHash, verifyPasslibPbkdf2Sha256 } from "./passlib-pbkdf2-sha256.util";

describe("passlib pbkdf2_sha256 password utilities", () => {
  const passlibHash = "$pbkdf2-sha256$29000$Zml4dHVyZS1zYWx0$Mk5Emmr7EEPcU2nSY.S077kUiboaIFONyqSK3qywHoQ";

  it("verifies passlib-format pbkdf2_sha256 hashes", () => {
    expect(verifyPasslibPbkdf2Sha256("password123", passlibHash)).toBe(true);
  });

  it("verifies document user password hashes through the domain helper", () => {
    expect(verifyDocumentUserPasswordHash("password123", passlibHash)).toBe(true);
  });

  it("rejects invalid passwords and unknown hash formats", () => {
    expect(verifyPasslibPbkdf2Sha256("wrong-password", passlibHash)).toBe(false);
    expect(verifyPasslibPbkdf2Sha256("password123", "$2b$10$invalidbcryptvalue")).toBe(false);
  });

  it("creates hashes that can be verified by the same passlib-compatible verifier", () => {
    const hash = hashPasslibPbkdf2Sha256("new-password");

    expect(hash).toMatch(/^\$pbkdf2-sha256\$29000\$/);
    expect(verifyPasslibPbkdf2Sha256("new-password", hash)).toBe(true);
  });
});
