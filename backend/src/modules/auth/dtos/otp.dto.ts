import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OtpMethod } from "../entities/otp.entity";

export class RequestOtpDto {
  @ApiProperty({
    description: "OTP delivery method",
    enum: OtpMethod,
    example: OtpMethod.EMAIL,
  })
  @IsEnum(OtpMethod)
  method: OtpMethod;

  @ApiPropertyOptional({
    description: "Email address for OTP (required for EMAIL method)",
    example: "t11@example.com",
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: "Phone number for OTP (required for SMS method)",
    example: "+1234567890",
  })
  @IsPhoneNumber()
  @IsOptional()
  phoneNumber?: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: "OTP code to verify",
    example: "123456",
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: "OTP delivery method",
    enum: OtpMethod,
    example: OtpMethod.EMAIL,
  })
  @IsEnum(OtpMethod)
  method: OtpMethod;

  @ApiPropertyOptional({
    description: "Email address for verification (required for EMAIL method)",
    example: "t11@example.com",
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: "Phone number for verification (required for SMS method)",
    example: "+1234567890",
  })
  @IsPhoneNumber()
  @IsOptional()
  phoneNumber?: string;
}

export class EnableTotpDto {
  @ApiProperty({
    description: "User ID to enable TOTP for",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  userId: string;
}

export class VerifyTotpDto {
  @ApiProperty({
    description: "TOTP code to verify",
    example: "123456",
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: "User ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  userId: string;
}

export class DisableTotpDto {
  @ApiProperty({
    description: "User ID to disable TOTP for",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: "Current TOTP code for verification",
    example: "123456",
  })
  @IsString()
  code: string;
}
