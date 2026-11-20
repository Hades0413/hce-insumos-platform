import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNumber, Max, Min, ValidateNested } from 'class-validator';
import { DocumentoDetalleDto, DocumentoLineaDto, DocumentoResumenDto } from '@hce/contracts';

class ItemCompraDto {
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) @Max(2_147_483_647) productoId: number;
  @ApiProperty({ example: 100 }) @IsInt() @Min(1) @Max(100_000) cantidad: number;

  @ApiProperty({ example: 0.15, description: 'Costo unitario (sin IGV)' })
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(1_000_000_000)
  costoUnitario: number;
}

export class RegistrarCompraDto {
  @ApiProperty({ type: [ItemCompraDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ItemCompraDto)
  items: ItemCompraDto[];
}

class ItemVentaDto {
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) @Max(2_147_483_647) productoId: number;
  @ApiProperty({ example: 2 }) @IsInt() @Min(1) @Max(100_000) cantidad: number;
}

export class RegistrarVentaDto {
  @ApiProperty({ type: [ItemVentaDto], description: 'El precio lo determina el servidor (precio de venta vigente)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items: ItemVentaDto[];
}

export class DocumentoResumenResponse implements DocumentoResumenDto {
  @ApiProperty() id: number;
  @ApiProperty({ format: 'date-time' }) fecRegistro: string;
  @ApiProperty() subTotal: number;
  @ApiProperty() igv: number;
  @ApiProperty() total: number;
  @ApiProperty() cantidadItems: number;
}

class DocumentoLineaResponse implements DocumentoLineaDto {
  @ApiProperty() id: number;
  @ApiProperty() productoId: number;
  @ApiProperty() productoNombre: string;
  @ApiProperty() nroLote: string;
  @ApiProperty() cantidad: number;
  @ApiProperty() precio: number;
  @ApiProperty() subTotal: number;
  @ApiProperty() igv: number;
  @ApiProperty() total: number;
}

export class DocumentoDetalleResponse extends DocumentoResumenResponse implements DocumentoDetalleDto {
  @ApiProperty({ type: [DocumentoLineaResponse] }) detalles: DocumentoLineaResponse[];
}
