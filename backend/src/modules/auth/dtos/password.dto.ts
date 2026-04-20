import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl } from "class-validator";
import { Transform } from "class-transformer";

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

export class RequestPasswordResetDto {
  @ApiProperty({
    description: "The URL in user's email that they can click to reset their password",
    example: "https://example.com/reset-password",
  })
  @IsUrl({ require_tld: false, require_protocol: true })
  endpointUrl: string;

  @ApiProperty({
    description: "The email address of the user requesting password reset",
    example: "t11@example.com",
  })
  @IsString()
  @Transform(({ value }) => value.trim().toLowerCase())
  email: string;
}

export class ResetPasswordWithCodeDto {
  @ApiProperty({
    description: "The password reset code sent to the user's email",
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: "The new password for the user",
    example: "newPassword123!",
  })
  @IsString()
  newPassword: string;
}
