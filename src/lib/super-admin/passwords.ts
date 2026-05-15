import { randomBytes } from 'node:crypto';

/**
 * Genera una contraseña temporal segura: 16 chars base64url-safe.
 * Se muestra UNA SOLA VEZ al super-admin tras crear el owner.
 */
export function generateTempPassword(): string {
  return randomBytes(12)
    .toString('base64')
    .replace(/\+/g, 'A')
    .replace(/\//g, 'B')
    .replace(/=/g, '')
    .slice(0, 16);
}
