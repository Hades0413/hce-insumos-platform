/**
 * Valida el parámetro `next` del login para evitar Open Redirect (OWASP A01):
 * solo rutas relativas del mismo origen ("/x"), nunca "//evil.com" ni "/\\evil.com"
 * ni esquemas ("javascript:").
 */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next || typeof next !== 'string') return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  try {
    const url = new URL(next, 'http://localhost');
    if (url.origin !== 'http://localhost') return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
