import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

/**
 * DTO for OAuth callback query parameters
 * Used when OAuth provider redirects back with authorization code
 */
export class OAuthCallbackDto {
  @ApiProperty({
    description: "Authorization code from OAuth provider",
    example: "4/0AfJohXmY1234567890abcdef",
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: "State parameter containing encoded metadata",
    example: "eyJyZWRpcmVjdFVybCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCJ9",
    required: false,
  })
  @IsString()
  @IsOptional()
  state?: string;
}

/**
 * DTO for exchanging OAuth authorization code for tokens
 * Used in POST /auth/{provider}/token endpoint
 */
export class OAuthTokenExchangeDto {
  @ApiProperty({
    description: "Authorization code from OAuth provider callback",
    example: "4/0AfJohXmY1234567890abcdef",
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: "Optional state parameter containing encoded metadata",
    example: "eyJyZWRpcmVjdFVybCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCJ9",
    required: false,
  })
  @IsString()
  @IsOptional()
  state?: string;
}
