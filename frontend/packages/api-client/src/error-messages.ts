import type { ApiError, ApiFieldError } from './api-error';

const FIELD_LABELS: ReadonlyMap<string, string> = new Map(
  Object.entries({
    cantidad: 'cantidad',
    costoUnitario: 'costo unitario',
    productoId: 'producto',
    nombre: 'nombre',
    nroLote: 'número de lote',
    costo: 'costo',
    precioVenta: 'precio de venta',
    email: 'correo',
    password: 'contraseña',
    desde: 'fecha desde',
    hasta: 'fecha hasta',
    items: 'productos',
    'Idempotency-Key': 'identificador de envío',
  }),
);

const LINE_PATH = /^items\[(\d+)\]\.(\w+)$/;

export function humanizeField(path: string | undefined): string | undefined {
  if (!path) return undefined;
  const line = LINE_PATH.exec(path);
  if (line) {
    const [, index, field] = line;
    return `Línea ${Number(index) + 1}, ${FIELD_LABELS.get(field!) ?? 'dato'}`;
  }
  return FIELD_LABELS.get(path) ?? 'Dato';
}

export function lineIndexOf(error: ApiFieldError): number | undefined {
  const m = error.field ? LINE_PATH.exec(error.field) : null;
  return m ? Number(m[1]) : undefined;
}

const MESSAGES_BY_CODE: ReadonlyMap<string, string> = new Map(
  Object.entries({
    NETWORK_ERROR:
      'No hay conexión con el servidor. Revisa la red y vuelve a intentarlo; lo que ingresaste sigue en pantalla.',
    TIMEOUT:
      'El servidor tardó demasiado en responder. Vuelve a intentarlo; si estabas registrando un documento, reintentar no lo duplica.',
    UPSTREAM_TIMEOUT:
      'El servicio tardó demasiado en responder. Vuelve a intentarlo; si estabas registrando un documento, reintentar no lo duplica.',
    UPSTREAM_UNAVAILABLE: 'El servicio no está disponible en este momento. Vuelve a intentarlo en unos minutos.',
    RATE_LIMITED: 'Se hicieron demasiadas solicitudes. Espera un momento y vuelve a intentarlo.',
    FORBIDDEN: 'Tu perfil no tiene permiso para esta operación.',
    CONCURRENCY_CONFLICT: 'Otro usuario modificó este registro. Recarga los datos y vuelve a intentarlo.',
    IDEMPOTENCY_CONFLICT:
      'Un envío anterior de este documento ya se registró con otro contenido. Revisa el historial antes de volver a registrarlo.',
    INTERNAL_ERROR: 'Ocurrió un error inesperado. Si se repite, comunica la referencia a soporte.',
  }),
);

export interface ErrorDescription {
  message: string;
  details: string[];
  reference?: string;
}

export function describeApiError(error: ApiError): ErrorDescription {
  const message =
    MESSAGES_BY_CODE.get(error.code) ?? (error.status >= 500 ? MESSAGES_BY_CODE.get('INTERNAL_ERROR')! : error.message);
  const details = error.errors.map((e) => {
    const label = humanizeField(e.field);
    return label ? `${label}: ${e.message}` : e.message;
  });
  return {
    message,
    details,
    reference: error.status >= 500 || error.status === 0 ? error.requestId : undefined,
  };
}
