import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class PageQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class SearchQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ maxLength: 100, description: 'Filtra por nombre o número de lote' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class RangoFechasQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ example: '2026-11-01', description: 'YYYY-MM-DD (UTC)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'desde debe tener formato YYYY-MM-DD' })
  desde?: string;

  @ApiPropertyOptional({ example: '2026-11-30', description: 'YYYY-MM-DD (UTC), inclusivo' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'hasta debe tener formato YYYY-MM-DD' })
  hasta?: string;
}
