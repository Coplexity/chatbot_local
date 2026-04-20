import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { configCORS } from "./cors";

describe("configCORS", () => {
  let mockApp: jest.Mocked<NestExpressApplication>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let originCallback: (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => void;

  beforeEach(() => {
    // Mock ConfigService
    mockConfigService = {
      get: jest.fn(),
    } as any;

    // Mock NestExpressApplication
    mockApp = {
      get: jest.fn().mockReturnValue(mockConfigService),
      enableCors: jest.fn((options: any) => {
        // Capture the origin function for testing
        originCallback = options.origin;
      }),
    } as any;
  });

  describe("origin validation", () => {
    it("should allow requests with no origin", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins")
          return ["http://localhost:3000"];
        if (key === "cors.allowCredentials")
          return true;
        return null;
      });

      configCORS(mockApp);

      const callback = jest.fn();
      originCallback(undefined, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should allow all origins when allowedOrigins is empty", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins")
          return [];
        if (key === "cors.allowCredentials")
          return false;
        return null;
      });

      configCORS(mockApp);

      const callback = jest.fn();
      originCallback("http://any-origin.com", callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should allow origins in the allowed list", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins") {
          return ["http://localhost:3000", "https://example.com"];
        }
        if (key === "cors.allowCredentials")
          return true;
        return null;
      });

      configCORS(mockApp);

      const callback = jest.fn();
      originCallback("http://localhost:3000", callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should reject origins not in the allowed list", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins") {
          return ["http://localhost:3000"];
        }
        if (key === "cors.allowCredentials")
          return true;
        return null;
      });

      configCORS(mockApp);

      const callback = jest.fn();
      originCallback("http://malicious-site.com", callback);

      expect(callback).toHaveBeenCalledWith(null, false);
    });
  });

  describe("wildcard subdomain support", () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins") {
          return ["*.example.com"];
        }
        if (key === "cors.allowCredentials")
          return true;
        return null;
      });

      configCORS(mockApp);
    });

    it("should allow subdomain matching wildcard", () => {
      const callback = jest.fn();
      originCallback("https://api.example.com", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should allow nested subdomain matching wildcard", () => {
      const callback = jest.fn();
      originCallback("https://api.v2.example.com", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should reject domain that doesn't match wildcard", () => {
      const callback = jest.fn();
      originCallback("https://example.org", callback);
      expect(callback).toHaveBeenCalledWith(null, false);
    });

    it("should reject base domain when wildcard expects subdomain", () => {
      const callback = jest.fn();
      originCallback("https://example.com", callback);
      expect(callback).toHaveBeenCalledWith(null, false);
    });
  });

  describe("wildcard port support", () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins") {
          return ["http://localhost:*"];
        }
        if (key === "cors.allowCredentials")
          return true;
        return null;
      });

      configCORS(mockApp);
    });

    it("should allow localhost with port 3000", () => {
      const callback = jest.fn();
      originCallback("http://localhost:3000", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should allow localhost with port 8080", () => {
      const callback = jest.fn();
      originCallback("http://localhost:8080", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should allow localhost with any port", () => {
      const callback = jest.fn();
      originCallback("http://localhost:9999", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should reject different host with same port pattern", () => {
      const callback = jest.fn();
      originCallback("http://example.com:3000", callback);
      expect(callback).toHaveBeenCalledWith(null, false);
    });

    it("should reject localhost without port", () => {
      const callback = jest.fn();
      originCallback("http://localhost", callback);
      expect(callback).toHaveBeenCalledWith(null, false);
    });
  });

  describe("multiple pattern types", () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins") {
          return [
            "http://localhost:*",
            "*.example.com",
            "https://specific-domain.com",
          ];
        }
        if (key === "cors.allowCredentials")
          return true;
        return null;
      });

      configCORS(mockApp);
    });

    it("should allow localhost with wildcard port", () => {
      const callback = jest.fn();
      originCallback("http://localhost:4200", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should allow wildcard subdomain", () => {
      const callback = jest.fn();
      originCallback("https://app.example.com", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should allow specific domain", () => {
      const callback = jest.fn();
      originCallback("https://specific-domain.com", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should reject non-matching domain", () => {
      const callback = jest.fn();
      originCallback("https://not-allowed.com", callback);
      expect(callback).toHaveBeenCalledWith(null, false);
    });
  });

  describe("configuration handling", () => {
    it("should use default empty array when allowedOrigins is undefined", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins")
          return undefined;
        if (key === "cors.allowCredentials")
          return false;
        return null;
      });

      configCORS(mockApp);

      const callback = jest.fn();
      originCallback("http://any-origin.com", callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should use default false when allowCredentials is undefined", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins")
          return ["http://localhost:3000"];
        if (key === "cors.allowCredentials")
          return undefined;
        return null;
      });

      configCORS(mockApp);

      expect(mockApp.enableCors).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: false,
        }),
      );
    });

    it("should enable credentials when configured", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins")
          return ["http://localhost:3000"];
        if (key === "cors.allowCredentials")
          return true;
        return null;
      });

      configCORS(mockApp);

      expect(mockApp.enableCors).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: true,
        }),
      );
    });
  });

  describe("edge cases", () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins") {
          return ["*.example.com", "http://localhost:*"];
        }
        if (key === "cors.allowCredentials")
          return true;
        return null;
      });

      configCORS(mockApp);
    });

    it("should handle origin with trailing slash", () => {
      const callback = jest.fn();
      originCallback("https://api.example.com/", callback);
      // Note: Browser typically don't send trailing slash in Origin header
      // but we should handle it gracefully
      expect(callback).toHaveBeenCalledWith(null, false);
    });

    it("should handle case-sensitive matching", () => {
      const callback = jest.fn();
      originCallback("https://API.example.com", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("should handle protocol mismatch", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins") {
          return ["http://example.com"];
        }
        if (key === "cors.allowCredentials")
          return true;
        return null;
      });

      configCORS(mockApp);

      const callback = jest.fn();
      originCallback("https://example.com", callback);
      expect(callback).toHaveBeenCalledWith(null, false);
    });
  });

  describe("app and ConfigService integration", () => {
    it("should call app.get to retrieve ConfigService", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins")
          return [];
        if (key === "cors.allowCredentials")
          return false;
        return null;
      });

      configCORS(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(ConfigService);
    });

    it("should call ConfigService.get for allowedOrigins", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins")
          return [];
        if (key === "cors.allowCredentials")
          return false;
        return null;
      });

      configCORS(mockApp);

      expect(mockConfigService.get).toHaveBeenCalledWith("cors.allowedOrigins");
    });

    it("should call ConfigService.get for allowCredentials", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins")
          return [];
        if (key === "cors.allowCredentials")
          return false;
        return null;
      });

      configCORS(mockApp);

      expect(mockConfigService.get).toHaveBeenCalledWith("cors.allowCredentials");
    });

    it("should call app.enableCors with origin function and credentials", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "cors.allowedOrigins")
          return [];
        if (key === "cors.allowCredentials")
          return true;
        return null;
      });

      configCORS(mockApp);

      expect(mockApp.enableCors).toHaveBeenCalledWith({
        origin: expect.any(Function),
        credentials: true,
      });
    });
  });
});
