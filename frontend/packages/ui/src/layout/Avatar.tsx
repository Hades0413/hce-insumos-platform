import { cn } from '../cn';

const TINTS = [
  'bg-brand-100 text-brand-800',
  'bg-ok-bg text-ok',
  'bg-warn-bg text-warn',
  'bg-brand-200 text-brand-900',
] as const;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toUpperCase() || '?';
}

function tintFor(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  return TINTS[Math.abs(h) % TINTS.length]!;
}

export function Avatar({ name, seed, className }: { name: string; seed?: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
        tintFor(seed ?? name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
