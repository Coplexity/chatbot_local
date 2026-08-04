import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Exclude, Expose, Type } from "class-transformer";
import { MessageDto } from "./message.dto";

@Exclude()
export class ConversationDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @Expose()
  id: string;

  @ApiPropertyOptional({ example: "Health consultation" })
  @Expose()
  title?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440001" })
  @Expose()
  userId: string;

  @ApiProperty({ example: 1500 })
  @Expose()
  totalTokens: number;

  @ApiProperty({ example: 4000 })
  @Expose()
  maxTokens: number;

  @ApiPropertyOptional({ example: {} })
  @Expose()
  metadata?: Record<string, any>;

  @ApiProperty({ example: "2025-12-09T10:30:00Z" })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: "2025-12-09T10:30:00Z" })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [MessageDto] })
  @Expose()
  @Type(() => MessageDto)
  messages?: MessageDto[];
}
