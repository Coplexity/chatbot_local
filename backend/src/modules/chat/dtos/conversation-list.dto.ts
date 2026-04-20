import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationQueryDto } from "../../../common/dtos/pagination.dto";

export class ConversationListDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Filter by conversation title",
    example: "health",
  })
  search?: string;
}
