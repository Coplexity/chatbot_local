import { AccountController } from "./account.controller";

describe("AccountController", () => {
  it("returns an access token and user on sign in", async () => {
    const user = { id: "1", email: "demo@example.com", role: "viewer", isActive: true };
    const controller = new AccountController(
      {
        signIn: jest.fn().mockResolvedValue(user),
        signUp: jest.fn(),
      } as any,
      {
        generateToken: jest.fn().mockReturnValue({ accessToken: "jwt-token" }),
      } as any,
      { clearAuthCookie: jest.fn() } as any,
    );

    await expect(controller.signIn({ email: "demo@example.com", password: "secret" })).resolves.toEqual({
      accessToken: "jwt-token",
      user,
    });
  });

  it("clears the auth cookie on logout", () => {
    const clearAuthCookie = jest.fn();
    const controller = new AccountController(
      {} as any,
      {} as any,
      { clearAuthCookie } as any,
    );
    const response = { clearCookie: jest.fn() } as any;

    expect(controller.logout(response)).toEqual({ message: "Logged out successfully" });
    expect(clearAuthCookie).toHaveBeenCalledWith(response);
  });
});
