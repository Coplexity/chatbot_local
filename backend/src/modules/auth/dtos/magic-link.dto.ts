import { IsEmail, IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RequestMagicLinkDto {
  @ApiProperty({
    description: "Email address to send magic link",
    example: "t11@example.com",
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: "Redirect URL after successful verification",
    example: "https://example.com/dashboard",
  })
  @IsString()
  @IsOptional()
  redirectUrl?: string;
}

export class VerifyMagicLinkDto {
  @ApiProperty({
    description: "Magic link token",
    example: "abcdef123456",
  })
  @IsString()
  token: string;

  @ApiPropertyOptional({
    description: "Redirect URL after successful verification (passed from request)",
    example: "https://example.com/dashboard",
  })
  @IsString()
  @IsOptional()
  redirect?: string;
}

export class MagicLinkResponseDto {
  @ApiProperty({
    description: "Success status",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Response message",
    example: "Magic link sent successfully",
  })
  message: string;

  @ApiPropertyOptional({
    description: "Email where magic link was sent",
    example: "t11@example.com",
  })
  email?: string;
}
