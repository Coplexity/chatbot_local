import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";

export function configCORS(app: NestExpressApplication) {
  const configService = app.get<ConfigService>(ConfigService);

  const allowedOrigins = configService.get<string[]>("cors.allowedOrigins") || [];
  const allowCredentials = configService.get<boolean>("cors.allowCredentials");

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
