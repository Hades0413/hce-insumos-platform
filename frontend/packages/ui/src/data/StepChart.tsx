export interface StepPoint {
  fecha: string;
  saldo: number;
}

export function StepChart({ points, label }: { points: ReadonlyArray<StepPoint>; label: string }) {
  if (points.length < 3) return null;
  const W = 600;
  const H = 72;
  const PAD = 6;
  const max = Math.max(...points.map((p) => p.saldo), 1);
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  let d = `M ${x(0)} ${y(points[0]!.saldo)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` H ${x(i)} V ${y(points[i]!.saldo)}`;
  }
  const area = `${d} V ${H - PAD} H ${x(0)} Z`;
  const last = points[points.length - 1]!;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-18 w-full" role="img" aria-label={label}>
        <path d={area} className="fill-brand-50" />
        <path
          d={d}
          className="fill-none stroke-brand-600"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        <circle cx={x(points.length - 1)} cy={y(last.saldo)} r="3" className="fill-brand-600" />
      </svg>
    </figure>
  );
}
