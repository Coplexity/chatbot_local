import { UserRole } from "../entities/user.entity";

export class JwtPayloadDto {
  sub: string;
  iat: number;
  exp: number;
  role?: UserRole;
  roles?: UserRole[];
}
