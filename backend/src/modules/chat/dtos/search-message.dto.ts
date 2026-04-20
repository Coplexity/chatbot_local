import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsDateString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/dtos/pagination.dto";

export class SearchMessageDto extends PaginationQueryDto {
  @ApiProperty({
    description: "Keyword to search in message content",
    example: "headache",
  })
  @IsString()
  keyword: string;

  @ApiPropertyOptional({
    description: "Filter by conversation ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description: "Start date for filtering messages (ISO 8601)",
    example: "2025-01-01T00:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: "End date for filtering messages (ISO 8601)",
    example: "2025-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
