import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ProductoDto } from '@hce/contracts';

const MONEY = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false } as const;

export class CrearProductoDto {
  @ApiProperty({ example: 'Paracetamol 500 mg tab', minLength: 2, maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre: string;

  @ApiProperty({ example: 'PCT-2026-001', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9\-_/.]*$/, { message: 'nroLote solo admite letras, números y - _ / .' })
  nroLote: string;

  @ApiPropertyOptional({ example: 0.15, minimum: 0, description: 'Si se omite: 0. Precio venta = costo × 1.35' })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  @Max(1_000_000_000)
  costo?: number;
}

export class ActualizarProductoDto extends CrearProductoDto {
  @ApiProperty({ example: 0.15, minimum: 0 })
  @IsNumber(MONEY)
  @Min(0)
  @Max(1_000_000_000)
  declare costo: number;

  @ApiPropertyOptional({ example: 0.2, minimum: 0, description: 'Si se omite: costo × 1.35' })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  @Max(1_000_000_000)
  precioVenta?: number;

  @ApiProperty({ example: 'AAAAAAAAB9E=', description: 'RowVersion (concurrencia optimista) recibido al leer' })
  @IsString()
  @Matches(/^[A-Za-z0-9+/]{11}=$/, { message: 'rowVersion inválido' })
  rowVersion: string;
}

export class ProductoResponse implements ProductoDto {
  @ApiProperty() id: number;
  @ApiProperty() nombre: string;
  @ApiProperty() nroLote: string;
  @ApiProperty({ format: 'date-time' }) fecRegistro: string;
  @ApiProperty() costo: number;
  @ApiProperty() precioVenta: number;
  @ApiProperty({ description: 'Stock actual calculado desde la tabla movimiento' }) stock: number;
  @ApiProperty() rowVersion: string;
}
