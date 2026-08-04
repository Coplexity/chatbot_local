import { AccountEntity, AccountProvider } from "../entities/account.entity";
import { DocumentUserEntity, DocumentUserRole } from "../entities/document-user.entity";
import { UserEntity, UserRole } from "../entities/user.entity";
import { verifyDocumentUserPasswordHash } from "../utils/passlib-pbkdf2-sha256.util";
import { BaseOAuthService, OAuthTokenResponse, OAuthUserInfo } from "./base-oauth.service";

class TestOAuthService extends BaseOAuthService {
  protected readonly provider = AccountProvider.GOOGLE;

  async getTokens(): Promise<OAuthTokenResponse> {
    return { accessToken: "access-token" };
  }

  async getUserInfo(): Promise<OAuthUserInfo> {
    return {
      providerId: "provider-user-id",
      email: "oauth@example.com",
      name: "OAuth User",
    };
  }

  getAuthorizationUrl(): string {
    return "https://example.com/oauth";
  }
}

describe("base oauth service", () => {
  it("creates a viewer document user and linked system user for new OAuth emails", async () => {
    const savedEntities: unknown[] = [];
    const manager = {
      findOne: jest.fn(async (entity) => {
        if (entity === DocumentUserEntity || entity === UserEntity || entity === AccountEntity) {
          return null;
        }
        return null;
      }),
      create: jest.fn((entity, payload) => ({
        id: entity === DocumentUserEntity ? "document-user-id" : "system-user-id",
        ...payload,
      })),
      save: jest.fn(async (entity) => {
        savedEntities.push(entity);
        return entity;
      }),
    };
    const dataSource = {
      transaction: jest.fn(async callback => callback(manager)),
    };
    const service = new TestOAuthService(dataSource as never, {} as never);

    const result = await service.authenticateWithOAuth("oauth-code");

    expect(manager.create).toHaveBeenCalledWith(DocumentUserEntity, expect.objectContaining({
      email: "oauth@example.com",
      fullName: "OAuth User",
      role: DocumentUserRole.VIEWER,
      isActive: true,
    }));
    const createdDocumentUser = manager.create.mock.calls.find(([entity]) => entity === DocumentUserEntity)?.[1];
    expect(verifyDocumentUserPasswordHash("not-the-generated-password", createdDocumentUser.passwordHash)).toBe(false);
    expect(manager.create).toHaveBeenCalledWith(UserEntity, {
      documentUserId: "document-user-id",
      email: "oauth@example.com",
      fullName: "OAuth User",
      role: UserRole.NONE,
      isActive: true,
    });
    expect(manager.create).toHaveBeenCalledWith(AccountEntity, expect.objectContaining({
      userId: "system-user-id",
      provider: AccountProvider.GOOGLE,
      providerAccountId: "provider-user-id",
      accessToken: "access-token",
    }));
    expect(result.user.documentUserId).toBe("document-user-id");
    expect(savedEntities).toHaveLength(3);
  });

  it("reuses an existing provider account before creating users by email", async () => {
    const existingUser = {
      id: "existing-system-user-id",
      documentUserId: "existing-document-user-id",
      email: "old-email@example.com",
    };
    const existingAccount = {
      id: "account-id",
      user: existingUser,
      userId: existingUser.id,
      provider: AccountProvider.GOOGLE,
      providerAccountId: "provider-user-id",
      accessToken: "old-token",
    };
    const manager = {
      findOne: jest.fn(async entity => (entity === AccountEntity ? existingAccount : null)),
      create: jest.fn(),
      save: jest.fn(async account => account),
    };
    const dataSource = {
      transaction: jest.fn(async callback => callback(manager)),
    };
    const service = new TestOAuthService(dataSource as never, {} as never);

    const result = await service.authenticateWithOAuth("oauth-code");

    expect(result.user).toBe(existingUser);
    expect(existingAccount.accessToken).toBe("access-token");
    expect(manager.create).not.toHaveBeenCalledWith(DocumentUserEntity, expect.anything());
    expect(manager.create).not.toHaveBeenCalledWith(UserEntity, expect.anything());
    expect(manager.save).toHaveBeenCalledWith(existingAccount);
  });
});
