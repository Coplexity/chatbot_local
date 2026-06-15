import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsEmail, IsString } from "class-validator";
import { UserDto } from "./user.dto";

const normalizeIdentifier = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().toLowerCase();
};

export class SignInDto {
  @ApiProperty({ example: "t11@example.com" })
  @IsString()
  @Transform(normalizeIdentifier)
  username: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  password: string;
}

/**
 * Base authentication response
 */
export class AuthResponseDto {
  @ApiProperty({ description: "JWT access token" })
  accessToken: string;

  @ApiProperty({ type: () => UserDto, description: "Authenticated user data" })
  @Type(() => UserDto)
  user: UserDto;

  @ApiPropertyOptional({ description: "Additional metadata from the authentication flow" })
  metadata?: Record<string, unknown>;
}

/**
 * Sign-in success response
 */
export class SignInSuccessResponseDto extends AuthResponseDto {}

/**
 * Sign-up success response
 */
export class SignUpSuccessResponseDto extends AuthResponseDto {}

export class LogoutSuccessResponseDto {
  @ApiProperty({ example: "Logged out successfully" })
  message: string;
}

export class SignUpDto {
  @ApiProperty({ example: "T11" })
  @IsString()
  fullName: string;

  @ApiProperty({ example: "t11@example.com" })
  @IsString()
  @IsEmail()
  @Transform(normalizeIdentifier)
  email: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  password: string;
}
