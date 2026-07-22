import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { BaseEntityDto } from "../../../common/dtos/base-entity.dto";
import { UserRole } from "../entities/user.entity";

export class UserDto extends BaseEntityDto {
  @ApiProperty()
  @Expose()
  documentUserId: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  fullName: string | null;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty({ enum: UserRole })
  @Expose()
  role: UserRole;

  @ApiProperty()
  @Expose()
  isActive: boolean;
}
