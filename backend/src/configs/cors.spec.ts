import type { NestExpressApplication } from "@nestjs/platform-express";
import type { CorsConfig } from "./root-config";
import { configCORS } from "./cors";

describe("configCORS", () => {
  let mockApp: jest.Mocked<NestExpressApplication>;
  let originCallback: (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => void;

  function createCorsConfig(overrides: Partial<CorsConfig> = {}): CorsConfig {
    return {
      allowCredentials: false,
      allowedOrigins: [],
      ...overrides,
    } as CorsConfig;
  }

  beforeEach(() => {
    mockApp = {
      enableCors: jest.fn((options: any) => {
        originCallback = options.origin;
      }),
    } as any;
  });

  it("should allow requests with no origin", () => {
    configCORS(mockApp, createCorsConfig({ allowedOrigins: ["http://localhost:3000"], allowCredentials: true }));

    const callback = jest.fn();
    originCallback(undefined, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it("should allow all origins when allowedOrigins is empty", () => {
    configCORS(mockApp, createCorsConfig());

    const callback = jest.fn();
    originCallback("http://any-origin.com", callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it("should allow origins in the allowed list", () => {
    configCORS(mockApp, createCorsConfig({ allowedOrigins: ["http://localhost:3000", "https://example.com"], allowCredentials: true }));

    const callback = jest.fn();
    originCallback("http://localhost:3000", callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it("should reject origins not in the allowed list", () => {
    configCORS(mockApp, createCorsConfig({ allowedOrigins: ["http://localhost:3000"], allowCredentials: true }));

    const callback = jest.fn();
    originCallback("http://malicious-site.com", callback);

    expect(callback).toHaveBeenCalledWith(null, false);
  });

  it("should support wildcard subdomains and ports", () => {
    configCORS(mockApp, createCorsConfig({ allowedOrigins: ["*.example.com", "http://localhost:*"], allowCredentials: true }));

    const subdomainCallback = jest.fn();
    originCallback("https://api.example.com", subdomainCallback);
    expect(subdomainCallback).toHaveBeenCalledWith(null, true);

    const portCallback = jest.fn();
    originCallback("http://localhost:4200", portCallback);
    expect(portCallback).toHaveBeenCalledWith(null, true);
  });

  it("should pass credentials through to enableCors", () => {
    configCORS(mockApp, createCorsConfig({ allowCredentials: true }));

    expect(mockApp.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: expect.any(Function),
        credentials: true,
      }),
    );
  });
});
