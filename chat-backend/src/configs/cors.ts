import type { NestExpressApplication } from "@nestjs/platform-express";
import type { CorsConfig } from "./root-config";

export function configCORS(app: NestExpressApplication, config: CorsConfig) {
  const allowedOrigins = config.allowedOrigins || [];
  const allowCredentials = config.allowCredentials;

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Allow requests if config is empty
      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }

      // Allow requests from allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // For wildcard patterns
      for (const allowedOrigin of allowedOrigins.filter(o => o.includes("*"))) {
        // Allow requests in wildcard subdomains
        if (allowedOrigin.startsWith("*.") && origin.endsWith(allowedOrigin.slice(1))) {
          return callback(null, true);
        }

        // allow requests in wildcard ports
        if (allowedOrigin.endsWith(":*")) {
          const baseOrigin = allowedOrigin.slice(0, -2);
          if (origin.startsWith(`${baseOrigin}:`)) {
            return callback(null, true);
          }
        }
      }

      return callback(null, false);
    },
    credentials: allowCredentials,
  });
}
