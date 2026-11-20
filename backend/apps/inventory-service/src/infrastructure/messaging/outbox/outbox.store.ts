import { Injectable } from '@nestjs/common';
import { MssqlExecutor } from '@hce/common';
import * as sql from 'mssql';

export interface OutboxRecord {
  readonly id: number;
  readonly eventId: string;
  readonly type: string;
  readonly aggregateId: number;
  readonly payload: unknown;
  readonly occurredAt: Date;
  readonly requestId: string | null;
}

interface OutboxRow {
  Id: number | string;
  EventoId: string;
  Tipo: string;
  AgregadoId: number;
  Payload: string;
  OcurridoEn: Date;
  RequestId: string | null;
}

@Injectable()
export class MssqlOutboxStore {
  constructor(private readonly db: MssqlExecutor) {}

  async reclamar(lote: number, segundosArriendo: number): Promise<OutboxRecord[]> {
    const r = await this.db.execute<OutboxRow>('dbo.usp_Outbox_Reclamar', (q) => {
      q.input('Lote', sql.Int, lote);
      q.input('SegundosArriendo', sql.Int, segundosArriendo);
    });
    return (r.recordset ?? [])
      .map((row) => ({
        id: Number(row.Id),
        eventId: row.EventoId.toLowerCase(),
        type: row.Tipo,
        aggregateId: row.AgregadoId,
        payload: JSON.parse(row.Payload) as unknown,
        occurredAt: row.OcurridoEn,
        requestId: row.RequestId,
      }))
      .sort((a, b) => a.id - b.id);
  }

  async marcarPublicados(ids: readonly number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.execute('dbo.usp_Outbox_MarcarPublicados', (q) =>
      q.input('Ids', sql.NVarChar(sql.MAX), JSON.stringify(ids)),
    );
  }

  async registrarFallo(id: number, error: string): Promise<void> {
    await this.db.execute('dbo.usp_Outbox_RegistrarFallo', (q) => {
      q.input('Id', sql.BigInt, id);
      q.input('Error', sql.NVarChar(400), error.slice(0, 400));
    });
  }

  async purgar(dias: number): Promise<number> {
    const r = await this.db.execute<{ Eliminados: number }>('dbo.usp_Outbox_Purgar', (q) =>
      q.input('Dias', sql.Int, dias),
    );
    return Number(r.recordset?.[0]?.Eliminados ?? 0);
  }
}
