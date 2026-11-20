import type { ReactNode } from 'react';
import { cn } from '../cn';

export function SubNav({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="Secciones" className="-mb-px flex gap-6 overflow-x-auto">
      {children}
    </nav>
  );
}

export function subNavClass(active: boolean): string {
  return cn(
    'inline-flex h-12 items-center border-b-[3px] text-[0.9375rem] font-semibold whitespace-nowrap',
    active ? 'border-brand-600 text-ink' : 'border-transparent text-muted hover:text-ink',
  );
}
