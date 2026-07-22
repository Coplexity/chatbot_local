import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  oldPassword: string;

  @ApiProperty()
  @IsString()
  newPassword: string;
}

export class GetPasswordResponseDto {
  @ApiProperty({ nullable: true })
  updatedAt: Date;
}
