import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsEmail, IsString } from "class-validator";
import { UserDto } from "./user.dto";

export class SignInDto {
  @ApiProperty({ example: "t11" })
  @IsString()
  @Transform(({ value }) => value.trim().toLowerCase())
  username: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  password: string;
}

/**
 * Base authentication response
 * This DTO marks responses that should have auth cookies set by the interceptor
 */
export class AuthResponseDto {
  @ApiProperty({ description: "JWT access token" })
  accessToken: string;

  @ApiProperty({ type: () => UserDto, description: "Authenticated user data" })
  @Type(() => UserDto)
  user: UserDto;

  @ApiPropertyOptional({ description: "Additional metadata from the authentication flow" })
  metadata?: Record<string, any>;
}

/**
 * Sign-in success response
 */
export class SignInSuccessResponseDto extends AuthResponseDto {}

/**
 * Sign-up success response
 */
export class SignUpSuccessResponseDto extends AuthResponseDto {}

export class SignUpDto {
  @ApiProperty({ example: "T11" })
  @IsString()
  name: string;

  @ApiProperty({ example: "t11@example.com" })
  @IsString()
  @IsEmail()
  @Transform(({ value }) => value.trim().toLowerCase())
  email: string;

  @ApiProperty({ example: "t11" })
  @IsString()
  @Transform(({ value }) => value.trim().toLowerCase())
  username: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  password: string;
}

export class GoogleOAuthUrlSuccessResponseDto {
  @ApiProperty()
  url: string;
}
