import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Generate asymmetric key pair for JWT signing
 * Supports RSA (RS256, RS384, RS512) and ECDSA (ES256, ES384, ES512)
 *
 * Usage: pnpm run generate:keys [algorithm] [keySize]
 * Examples:
 *   pnpm run generate:keys RS256        # RSA 2048-bit (default)
 *   pnpm run generate:keys RS384 3072   # RSA 3072-bit
 *   pnpm run generate:keys RS512 4096   # RSA 4096-bit
 *   pnpm run generate:keys ES256        # ECDSA P-256
 *   pnpm run generate:keys ES384        # ECDSA P-384
 *   pnpm run generate:keys ES512        # ECDSA P-521
 */

type Algorithm = "RS256" | "RS384" | "RS512" | "ES256" | "ES384" | "ES512";

interface KeyConfig {
  type: "rsa" | "ec";
  modulusLength?: number;
  namedCurve?: string;
}

const ALGORITHM_CONFIG: Record<Algorithm, KeyConfig> = {
  RS256: { type: "rsa", modulusLength: 2048 },
  RS384: { type: "rsa", modulusLength: 3072 },
  RS512: { type: "rsa", modulusLength: 4096 },
  ES256: { type: "ec", namedCurve: "prime256v1" }, // P-256
  ES384: { type: "ec", namedCurve: "secp384r1" }, // P-384
  ES512: { type: "ec", namedCurve: "secp521r1" }, // P-521
};

function generateKeys(algorithm: Algorithm = "RS256", customKeySize?: number) {
  console.log(`🔐 Generating ${algorithm} key pair for JWT...`);

  const config = ALGORITHM_CONFIG[algorithm];
  if (!config) {
    console.error(`❌ Unsupported algorithm: ${algorithm}`);
    console.log("Supported algorithms: RS256, RS384, RS512, ES256, ES384, ES512");
    process.exit(1);
  }

  // Override RSA key size if provided
  if (config.type === "rsa" && customKeySize) {
    config.modulusLength = customKeySize;
  }

  const { publicKey, privateKey } = generateKeyPairSync(config.type as any, {
    ...(config.type === "rsa" && {
      modulusLength: config.modulusLength,
    }),
    ...(config.type === "ec" && {
      namedCurve: config.namedCurve,
    }),
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  // Ensure keys directory exists
  const keysDir = join(__dirname, "..", "..", "keys");
  if (!existsSync(keysDir)) {
    console.log("📁 Creating keys directory...");
    mkdirSync(keysDir, { recursive: true });
  }

  // Save keys to files
  const privateKeyPath = join(keysDir, "private.key");
  const publicKeyPath = join(keysDir, "public.key");

  try {
    writeFileSync(privateKeyPath, privateKey);
    writeFileSync(publicKeyPath, publicKey);

    console.log("✅ Key pair generated successfully!");
    console.log(`   Algorithm: ${algorithm}`);
    if (config.type === "rsa") {
      console.log(`   Key size: ${config.modulusLength} bits`);
    }
    else {
      console.log(`   Curve: ${config.namedCurve}`);
    }
    console.log(`   Private key: ${privateKeyPath}`);
    console.log(`   Public key: ${publicKeyPath}`);
    console.log("");
    console.log("⚠️  SECURITY REMINDERS:");
    console.log("   ✓ keys/ directory is in .gitignore");
    console.log("   ✓ Keep private.key SECRET and SECURE");
    console.log("   ✓ Public key can be shared for verification");
    console.log("");
    console.log("🔒 Update your config or environment:");
    console.log(`   JWT_ALGORITHM=${algorithm}`);
    console.log("   JWT_PRIVATE_KEY_PATH=./keys/private.key");
    console.log("   JWT_PUBLIC_KEY_PATH=./keys/public.key");
  }
  catch (error) {
    console.error("❌ Error writing keys:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const algorithm = (args[0] || "RS256").toUpperCase() as Algorithm;
  const keySize = args[1] ? Number.parseInt(args[1], 10) : undefined;

  generateKeys(algorithm, keySize);
}

export { generateKeys };
