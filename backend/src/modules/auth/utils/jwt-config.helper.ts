/**
 * JWT Algorithm Type Checker
 * Determines if a JWT algorithm is symmetric (HMAC) or asymmetric (RSA/ECDSA)
 */

import { ConfigService } from "@nestjs/config";
import { JwtModuleOptions } from "@nestjs/jwt";
import { readFileSync } from "fs";
import { StringValue } from "ms";
import { join } from "path";

export enum JwtAlgorithmType {
  SYMMETRIC = "SYMMETRIC", // HS256, HS384, HS512
  ASYMMETRIC = "ASYMMETRIC", // RS256, RS384, RS512, ES256, ES384, ES512, PS256, PS384, PS512
}

/**
 * Check if JWT algorithm is symmetric or asymmetric
 * @param algorithm - JWT algorithm string (e.g., 'RS256', 'HS256')
 * @returns Algorithm type
 */
export function getAlgorithmType(algorithm: string): JwtAlgorithmType {
  const alg = algorithm.toUpperCase();

  switch (true) {
    case alg.startsWith("HS"): // HMAC algorithms
      return JwtAlgorithmType.SYMMETRIC;

    case alg.startsWith("RS"): // RSA algorithms
    case alg.startsWith("ES"): // ECDSA algorithms
    case alg.startsWith("PS"): // RSA-PSS algorithms
      return JwtAlgorithmType.ASYMMETRIC;

    default:
      throw new Error(
        `Unsupported JWT algorithm: ${algorithm}. `
        + "Supported algorithms: HS256, HS384, HS512, RS256, RS384, RS512, ES256, ES384, ES512, PS256, PS384, PS512",
      );
  }
}

/**
 * Check if algorithm is symmetric (HMAC-based)
 */
export function isSymmetricAlgorithm(algorithm: string): boolean {
  return getAlgorithmType(algorithm) === JwtAlgorithmType.SYMMETRIC;
}

/**
 * JWT Configuration Factory for NestJS JwtModule
 */
export function jwtConfigFactory(configService: ConfigService): JwtModuleOptions {
  const algorithm = configService.get<string>("jwt.algorithm", "HS256");
  const expiresIn = configService.getOrThrow<number | StringValue>("jwt.expiresIn");

  // Check algorithm type using helper
  if (isSymmetricAlgorithm(algorithm)) {
    // Symmetric: Use shared secret for signing
    const secret = configService.get<string>("jwt.secret");
    if (!secret) {
      throw new Error(`JWT algorithm '${algorithm}' requires secret in config`);
    }

    return {
      secret,
      signOptions: { algorithm: algorithm as any, expiresIn },
    };
  }
  else {
    // Asymmetric: Use private key for signing
    const privateKeyPath = configService.get<string>("jwt.privateKeyPath");
    const publicKeyPath = configService.get<string>("jwt.publicKeyPath");
    if (!privateKeyPath || !publicKeyPath) {
      throw new Error(
        `JWT algorithm '${algorithm}' requires privateKeyPath and publicKeyPath in config. `
        + "Run: pnpm run generate:keys",
      );
    }

    const privateKey = readFileSync(join(process.cwd(), privateKeyPath), "utf8");
    const publicKey = readFileSync(join(process.cwd(), publicKeyPath), "utf8");

    return {
      privateKey,
      publicKey,
      signOptions: { algorithm: algorithm as any, expiresIn },
    };
  }
}
