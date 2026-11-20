'use client';

import { formatPEN } from '@hce/domain';
import { useAnimatedNumber } from '../hooks';
import { cn } from '../cn';

export function AnimatedMoney({ value, className }: { value: number; className?: string }) {
  const shown = useAnimatedNumber(value);
  return (
    <span className={cn('tabular-nums', className)}>
      <span aria-hidden="true">{formatPEN(shown)}</span>
      <span className="sr-only">{formatPEN(value)}</span>
    </span>
  );
}
