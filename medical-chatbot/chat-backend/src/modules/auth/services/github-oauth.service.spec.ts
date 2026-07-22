import { UnauthorizedException } from "@nestjs/common";
import { GitHubOAuthService } from "./github-oauth.service";

describe("github oauth service", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("rejects GitHub users without a verified email", async () => {
    const service = new GitHubOAuthService({} as never, {} as never, {} as never);
    globalThis.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 123,
          email: null,
          login: "octocat",
          name: "Octo Cat",
          avatar_url: "https://example.com/avatar.png",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          { email: "unverified@example.com", primary: true, verified: false },
        ]),
      }) as never;

    await expect(service.getUserInfo({ accessToken: "access-token" })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
