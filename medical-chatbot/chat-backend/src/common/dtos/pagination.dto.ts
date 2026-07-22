import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class PaginationQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => value ?? 1)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => value ?? 10)
  @IsInt()
  @Min(1)
  limit: number = 10;
}

export class PaginationWithSearchQueryDto extends PaginationQueryDto {
  @ApiProperty({ required: false, default: "" })
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => value ?? "")
  search: string = "";
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
