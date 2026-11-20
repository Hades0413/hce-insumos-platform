'use client';

import { useState } from 'react';
import type { TipoExcepcion } from '@hce/api-client';
import { Badge, Button, formatDateTime, type Tone } from '@hce/ui';
import { ExcepcionForm } from './ExcepcionForm';
import type { EstadoPermiso, FilaPermiso } from './model';

const ESTADO: Record<EstadoPermiso, { label: string; tone: Tone }> = {
  rol: { label: 'Por rol', tone: 'neutral' },
  otorgado: { label: 'Otorgado', tone: 'ok' },
  denegado: { label: 'Denegado', tone: 'danger' },
  'sin-acceso': { label: 'Sin acceso', tone: 'neutral' },
};

interface Props {
  fila: FilaPermiso;
  descripcion: string;
  ocupado: boolean;
  onGuardar: (tipo: TipoExcepcion, values: { motivo: string; vigenteHasta?: string }) => void;
  onQuitar: () => void;
}

export function PermisoFila({ fila, descripcion, ocupado, onGuardar, onQuitar }: Props) {
  const [formulario, setFormulario] = useState<TipoExcepcion | null>(null);
  const estado = ESTADO[fila.estado];
  const exc = fila.excepcion;

  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className={fila.efectivo ? 'font-semibold text-ink' : 'font-semibold text-muted'}>{descripcion}</span>
            <Badge tone={estado.tone}>{estado.label}</Badge>
            {exc?.vigenteHasta && <Badge tone="warn">Vence {formatDateTime(exc.vigenteHasta)}</Badge>}
          </p>
          <p className="mt-0.5 font-code text-xs text-muted">{fila.codigo}</p>
          {exc && (
            <p className="mt-1.5 text-sm text-muted">
              {exc.tipo === 'GRANT' ? 'Otorgado' : 'Denegado'} por {exc.otorgadoPor}, {formatDateTime(exc.fecRegistro)}
              <span className="mt-0.5 block text-ink">«{exc.motivo}»</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {exc ? (
            <Button size="sm" variant="secondary" disabled={ocupado} onClick={onQuitar}>
              Quitar excepción
            </Button>
          ) : fila.efectivo ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-danger hover:bg-danger-bg"
              disabled={ocupado || formulario !== null}
              onClick={() => setFormulario('DENY')}
            >
              Denegar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled={ocupado || formulario !== null}
              onClick={() => setFormulario('GRANT')}
            >
              Otorgar
            </Button>
          )}
        </div>
      </div>
      {formulario && (
        <ExcepcionForm
          tipo={formulario}
          permisoLabel={descripcion}
          onCancel={() => setFormulario(null)}
          onSubmit={(values) => {
            onGuardar(formulario, values);
            setFormulario(null);
          }}
        />
      )}
    </li>
  );
}
