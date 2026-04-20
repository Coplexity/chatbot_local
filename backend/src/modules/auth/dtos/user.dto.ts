import { ApiProperty } from "@nestjs/swagger";
import { BaseEntityDto } from "../../../common/dtos/base-entity.dto";
import { UserRole } from "../entities/user.entity";

export class UserDto extends BaseEntityDto {
  @ApiProperty({ nullable: true })
  name: string;

  @ApiProperty({ nullable: true, required: false })
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true, required: false })
  image: string;

  @ApiProperty({ enum: UserRole, required: false })
  role?: UserRole;

  @ApiProperty({ enum: UserRole, required: false, isArray: true })
  roles?: UserRole[];
}
