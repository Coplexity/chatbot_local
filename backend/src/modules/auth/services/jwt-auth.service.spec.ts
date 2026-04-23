import { JwtAuthService } from "./jwt-auth.service";

describe("jwtAuthService", () => {
  it("extracts a bearer token before checking cookies", () => {
    const service = new JwtAuthService(
      {} as any,
      { getCookieName: jest.fn().mockReturnValue("fdac") } as any,
    );

    const token = service.extractTokenFromRequest({
      headers: { authorization: "Bearer header-token" },
      cookies: { fdac: "cookie-token" },
    } as any);

    expect(token).toBe("header-token");
  });

  it("falls back to the auth cookie when no bearer token exists", () => {
    const service = new JwtAuthService(
      {} as any,
      { getCookieName: jest.fn().mockReturnValue("fdac") } as any,
    );

    const token = service.extractTokenFromRequest({
      headers: {},
      cookies: { fdac: "cookie-token" },
    } as any);

    expect(token).toBe("cookie-token");
  });

  it("returns null when the request carries no auth token", () => {
    const service = new JwtAuthService(
      {} as any,
      { getCookieName: jest.fn().mockReturnValue("fdac") } as any,
    );

    const token = service.extractTokenFromRequest({
      headers: {},
      cookies: {},
    } as any);

    expect(token).toBeNull();
  });
});
