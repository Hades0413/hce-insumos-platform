import { cn } from '../cn';

export function SkeletonTable({
  columns = 5,
  rows = 6,
  className,
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  const cols = Array.from({ length: columns }, (_, i) => i);
  return (
    <div className={cn('overflow-hidden rounded-card border border-line bg-surface', className)} aria-hidden="true">
      <div className="flex gap-6 border-b border-line-strong bg-canvas px-4 py-3">
        {cols.map((c) => (
          <span key={c} className={cn('skeleton h-3', c === 1 ? 'flex-[2]' : 'flex-1')} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-6 border-t border-line px-4 py-4 first:border-t-0">
          {cols.map((c) => (
            <span
              key={c}
              className={cn('skeleton h-4', c === 1 ? 'flex-[2]' : 'flex-1', c === columns - 1 && 'max-w-24')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3" aria-hidden="true">
        <span className="skeleton h-8 w-72" />
        <span className="skeleton h-4 w-[28rem] max-w-full" />
      </div>
      <SkeletonTable />
    </div>
  );
}
