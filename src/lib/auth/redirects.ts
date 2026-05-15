/**
 * Valida un parámetro `next` de redirect — evita open redirects a dominios externos.
 * Solo acepta paths absolutos del mismo origen y excluye las rutas de auth para
 * evitar loops.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (typeof next !== 'string') return null;
  if (!next.startsWith('/')) return null;
  if (next.startsWith('//')) return null; // protocol-relative → externo disfrazado
  const path = next.split('?')[0]?.split('#')[0] ?? '';
  const blocked = ['/login', '/forgot-password', '/reset-password', '/change-password'];
  if (blocked.some((b) => path === b || path.startsWith(`${b}/`))) return null;
  return next;
}
