import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { MessageRole } from "../entities/message.entity";

@Exclude()
export class MessageDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @Expose()
  id: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440001" })
  @Expose()
  conversationId: string;

  @ApiProperty({ enum: MessageRole, example: MessageRole.USER })
  @Expose()
  role: MessageRole;

  @ApiProperty({ example: "I have a headache and fever for the past two days" })
  @Expose()
  content: string;

  @ApiProperty({ example: 150 })
  @Expose()
  tokenCount: number;

  @ApiPropertyOptional({ example: {} })
  @Expose()
  metadata?: Record<string, any>;

  @ApiProperty({ example: "2025-12-09T10:30:00Z" })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: "2025-12-09T10:30:00Z" })
  @Expose()
  updatedAt: Date;
}
