import type { ReactNode } from 'react';
import { cn } from '../cn';

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-[4px] border border-b-2 border-line-strong bg-surface px-1.5 font-code text-[0.6875rem] font-semibold text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
