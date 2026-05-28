import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, IsIn, IsOptional, IsArray } from "class-validator";

export class SendMessageDto {
  @ApiProperty({
    description: "Message content from the user",
    maxLength: 5000,
    example: "I have a headache and fever for the past two days",
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    description: "Chat mode: 'basic' for quick answers, 'deep' for detailed reasoning",
    enum: ["basic", "deep"],
    default: "basic",
  })
  @IsOptional()
  @IsIn(["basic", "deep"])
  mode?: "basic" | "deep";

  @ApiPropertyOptional({
    description: "User role for context-aware responses",
    example: "bac_si_tram_y_te",
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: "Selected user IDs for query scope filtering", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  user_ids?: string[];
}
