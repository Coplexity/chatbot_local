import { BadRequestException } from "@nestjs/common";
import { DocumentUserEntity, DocumentUserRole } from "../entities/document-user.entity";
import { UserEntity, UserRole } from "../entities/user.entity";
import { verifyDocumentUserPasswordHash } from "../utils/passlib-pbkdf2-sha256.util";
import { AccountService } from "./account.service";

describe("account service", () => {
  it("creates a viewer document user and linked system user on signup", async () => {
    const manager = {
      create: jest.fn((entity, payload) => ({
        id: entity === DocumentUserEntity ? "42" : "system-user-id",
        ...payload,
      })),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async user => user),
    };
    const dataSource = {
      transaction: jest.fn(async callback => callback(manager)),
    };
    const service = new AccountService({} as never, {} as never, dataSource as never);

    const systemUser = await service.signUp({
      email: "viewer@example.com",
      fullName: "Viewer User",
      password: "password123",
    });

    expect(manager.create).toHaveBeenCalledWith(DocumentUserEntity, expect.objectContaining({
      email: "viewer@example.com",
      fullName: "Viewer User",
      role: DocumentUserRole.VIEWER,
      isActive: true,
    }));
    const createdDocumentUser = manager.create.mock.calls.find(([entity]) => entity === DocumentUserEntity)?.[1];
    expect(verifyDocumentUserPasswordHash("password123", createdDocumentUser.passwordHash)).toBe(true);
    expect(manager.create).toHaveBeenCalledWith(UserEntity, {
      documentUserId: "42",
      email: "viewer@example.com",
      fullName: "Viewer User",
      role: UserRole.NONE,
      isActive: true,
    });
    expect(systemUser.documentUserId).toBe("42");
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects signup when the document user email already exists", async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: "42", email: "viewer@example.com" }),
    };
    const dataSource = {
      transaction: jest.fn(async callback => callback(manager)),
    };
    const service = new AccountService({} as never, {} as never, dataSource as never);

    await expect(service.signUp({
      email: "viewer@example.com",
      fullName: "Viewer User",
      password: "password123",
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rolls back signup when linked system user creation fails", async () => {
    const rollbackError = new Error("duplicate system user");
    const manager = {
      create: jest.fn((entity, payload) => ({
        id: entity === DocumentUserEntity ? "42" : "system-user-id",
        ...payload,
      })),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (entity) => {
        if (entity.documentUserId === "42") {
          throw rollbackError;
        }

        return entity;
      }),
    };
    const dataSource = {
      transaction: jest.fn(async callback => callback(manager)),
    };
    const service = new AccountService({} as never, {} as never, dataSource as never);

    await expect(service.signUp({
      email: "viewer@example.com",
      fullName: "Viewer User",
      password: "password123",
    })).rejects.toThrow(rollbackError);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.save).toHaveBeenCalledTimes(2);
  });
});
