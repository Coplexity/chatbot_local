import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateConversationDto {
  @ApiPropertyOptional({
    description: "Title of the conversation",
    maxLength: 255,
    example: "Health consultation",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
