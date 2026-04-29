import { ApiProperty } from "@nestjs/swagger";
import { BaseEntityDto } from "../../../common/dtos/base-entity.dto";
import { UserRole } from "../entities/user.entity";

export class UserDto extends BaseEntityDto {
  @ApiProperty({ nullable: true })
  fullName: string | null;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  isActive: boolean;
}
