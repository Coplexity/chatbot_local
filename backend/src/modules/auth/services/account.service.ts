import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { compareSync, hashSync } from "bcrypt";
import { SignInDto, SignUpDto } from "../dtos/auth.dto";
import { ChangePasswordDto } from "../dtos/password.dto";
import { DocumentUserEntity } from "../entities/document-user.entity";
import { UserEntity, UserRole } from "../entities/user.entity";
import { DocumentUserRepository } from "../repositories/python-user.repository";
import { UserRepository } from "../repositories/user.repository";

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private readonly SALT_ROUND: number;

  constructor(
    private userRepo: UserRepository,
    private documentUserRepo: DocumentUserRepository,
    private configService: ConfigService,
  ) {
    this.SALT_ROUND = this.configService.getOrThrow<number>("crypto.saltRounds");
  }

  private mapPythonRoleToSystemRole(role: string): UserRole {
    if (role === UserRole.ADMIN || role === UserRole.EDITOR || role === UserRole.VIEWER) {
      return role;
    }
    return UserRole.VIEWER;
  }

  private async ensureSystemUserFromPython(documentUser: DocumentUserEntity): Promise<UserEntity> {
    let systemUser = await this.userRepo.findOne({ where: { documentUserId: documentUser.id } });

    if (!systemUser) {
      systemUser = this.userRepo.create({
        documentUserId: documentUser.id,
        email: documentUser.email,
        fullName: documentUser.fullName,
        role: this.mapPythonRoleToSystemRole(documentUser.role),
        chatRole: documentUser.chatRole,
        isActive: documentUser.isActive,
      });
      await this.userRepo.save(systemUser);
      return systemUser;
    }

    systemUser.email = documentUser.email;
    systemUser.fullName = documentUser.fullName;
    systemUser.role = this.mapPythonRoleToSystemRole(documentUser.role);
    systemUser.chatRole = documentUser.chatRole;
    systemUser.isActive = documentUser.isActive;

    await this.userRepo.save(systemUser);
    return systemUser;
  }

  private async getDocumentUserByEmailOrThrow(email: string): Promise<DocumentUserEntity> {
    const documentUser = await this.documentUserRepo.findByEmail(email);

    if (!documentUser) {
      throw new UnauthorizedException("Python user not found");
    }

    return documentUser;
  }

  async signIn(dto: SignInDto): Promise<UserEntity> {
    const documentUser = await this.getDocumentUserByEmailOrThrow(dto.email);

    if (!documentUser.isActive) {
      throw new UnauthorizedException("User is inactive");
    }

    const isPasswordMatch = compareSync(dto.password, documentUser.passwordHash);
    if (!isPasswordMatch) {
      throw new UnauthorizedException("Email or password is not correct");
    }

    return this.ensureSystemUserFromPython(documentUser);
  }

  async signUp(dto: SignUpDto): Promise<UserEntity> {
    const documentUser = await this.getDocumentUserByEmailOrThrow(dto.email);

    const isPasswordMatch = compareSync(dto.password, documentUser.passwordHash);
    if (!isPasswordMatch) {
      throw new UnauthorizedException("Email or password is not correct");
    }

    if (!documentUser.fullName && dto.fullName) {
      documentUser.fullName = dto.fullName;
      await this.documentUserRepo.save(documentUser);
    }

    return this.ensureSystemUserFromPython(documentUser);
  }

  async getUser(userId: string) {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async findUserByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  async updateUser(userId: string, updateData: Partial<UserEntity>) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    Object.assign(user, updateData);
    await user.save();

    return user;
  }

  async getPassword(userId: string) {
    const systemUser = await this.userRepo.findOne({ where: { id: userId } });

    if (!systemUser?.documentUserId) {
      return { updatedAt: null as Date | null };
    }

    const documentUser = await this.documentUserRepo.findOne({ where: { id: systemUser.documentUserId } });

    return { updatedAt: documentUser?.updatedAt ?? null };
  }

  async createPassword(userId: string, dto: ChangePasswordDto) {
    const systemUser = await this.userRepo.findOne({ where: { id: userId } });

    if (!systemUser?.documentUserId) {
      throw new BadRequestException("Python user link not found");
    }

    const documentUser = await this.documentUserRepo.findOne({ where: { id: systemUser.documentUserId } });

    if (!documentUser) {
      throw new BadRequestException("Python user not found");
    }

    documentUser.passwordHash = hashSync(dto.newPassword, this.SALT_ROUND);
    await this.documentUserRepo.save(documentUser);

    return { message: "Password created successfully" };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const systemUser = await this.userRepo.findOne({ where: { id: userId } });

    if (!systemUser?.documentUserId) {
      throw new BadRequestException("Python user link not found");
    }

    const documentUser = await this.documentUserRepo.findOne({ where: { id: systemUser.documentUserId } });

    if (!documentUser) {
      throw new BadRequestException("Python user not found");
    }

    const isPasswordMatch = compareSync(dto.oldPassword, documentUser.passwordHash);

    if (!isPasswordMatch) {
      throw new BadRequestException("Old password is not correct");
    }

    documentUser.passwordHash = hashSync(dto.newPassword, this.SALT_ROUND);
    await this.documentUserRepo.save(documentUser);

    this.logger.log(`Password changed for user: ${userId}`);

    return { message: "Password changed successfully" };
  }
}
