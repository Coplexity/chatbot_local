import { UnauthorizedException } from "@nestjs/common";
import { GoogleOAuthService } from "./google-oauth.service";

describe("google oauth service", () => {
  it("rejects unverified Google emails before user provisioning", async () => {
    const dataSource = {
      transaction: jest.fn(),
    };
    const service = new GoogleOAuthService({} as never, dataSource as never, {} as never);

    await expect(service.validateGoogleUser({
      googleId: "google-id",
      email: "unverified@example.com",
      emailVerified: false,
      name: "Unverified User",
      accessToken: "access-token",
    })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
