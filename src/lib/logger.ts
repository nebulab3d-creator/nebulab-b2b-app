import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

// Solo aceptar un LOG_LEVEL válido. `??` no alcanza: si LOG_LEVEL="" (definido
// pero vacío, como en .env.local) pino recibe level:"" y tira
// "default level: must be included in custom levels".
const VALID_LEVELS = new Set(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']);
const envLevel = process.env.LOG_LEVEL?.trim().toLowerCase();
const level = envLevel && VALID_LEVELS.has(envLevel) ? envLevel : isDev ? 'debug' : 'info';

export const logger = pino({
  level,
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
  base: {
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  },
});
