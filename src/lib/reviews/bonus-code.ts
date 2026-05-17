import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para legibilidad

export function generateBonusCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}
