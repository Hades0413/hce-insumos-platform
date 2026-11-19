import { formatPEN } from '@hce/domain';

export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={['tabular-nums', className].filter(Boolean).join(' ')}>{formatPEN(value)}</span>;
}

const DATE_TIME = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' });

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : DATE_TIME.format(d);
}

export function DateTime({ value }: { value: string }) {
  return <time dateTime={value}>{formatDateTime(value)}</time>;
}
