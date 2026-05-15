import path from 'node:path';

import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // Carga .env.local (y .env*) sin prefijo, igual que Next.js
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      globals: true,
      css: true,
      env,
      // RLS tests pegan a Supabase real → más tiempo por test
      testTimeout: 30_000,
      hookTimeout: 60_000,
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  };
});
