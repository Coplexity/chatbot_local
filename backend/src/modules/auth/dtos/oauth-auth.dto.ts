import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

/**
 * DTO for OAuth authorization request query parameters
 * Used by both Google and GitHub OAuth flows
 */
export class OAuthAuthDto {
  @ApiProperty({
    description: "URL to redirect after successful authentication",
    required: false,
  })
  @IsString()
  @IsOptional()
  redirectUrl?: string;

  @ApiProperty({
    description: "Name of the client application initiating the OAuth flow. Currently not used.",
    example: "",
    required: false,
  })
  @IsString()
  @IsOptional()
  clientName?: string;

  @ApiProperty({
    description: "Set to 'false' to return JSON instead of redirecting",
    example: "false",
    required: false,
  })
  @IsString()
  @IsOptional()
  redirect?: string;
}
