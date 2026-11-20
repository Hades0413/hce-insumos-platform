import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TipoExcepcion } from '@hce/contracts';

export class GuardarExcepcionDto {
  @ApiProperty({ enum: ['GRANT', 'DENY'], description: 'GRANT otorga un permiso extra; DENY lo quita (DENY gana)' })
  @IsIn(['GRANT', 'DENY'])
  tipo: TipoExcepcion;

  @ApiProperty({ example: 'Cubre turno de almacén del 20 al 22 de noviembre', minLength: 10, maxLength: 300 })
  @IsString()
  @MinLength(10)
  @MaxLength(300)
  motivo: string;

  @ApiPropertyOptional({ example: '2026-11-22T23:59:00.000Z', description: 'Vigencia (UTC). Vacío = indefinida' })
  @IsOptional()
  @IsISO8601({ strict: true })
  vigenteHasta?: string;
}
