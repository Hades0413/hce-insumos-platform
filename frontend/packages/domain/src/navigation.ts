const BASE = 'http://app.invalid';
const MAX_LENGTH = 512;

export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (typeof next !== 'string' || next.length === 0 || next.length > MAX_LENGTH) return fallback;
  if (!next.startsWith('/') || next.includes('\\') || /[\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return fallback;
    const out = `${url.pathname}${url.search}${url.hash}`;
    if (!out.startsWith('/') || out.startsWith('//')) return fallback;
    if (new URL(out, BASE).origin !== BASE) return fallback;
    return out;
  } catch {
    return fallback;
  }
}
