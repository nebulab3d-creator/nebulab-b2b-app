/**
 * Crea (o promueve) un super-admin de Nebulab3D.
 *
 * Uso:
 *   npm run seed:super-admin -- --email <email> --password <password>
 *
 * Idempotente: si el auth.user ya existe, no falla — actualiza el password
 * y se asegura de que esté en `super_admins`.
 *
 * Requiere SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL en .env.local.
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

import type { Database } from '../src/lib/supabase/database.types';

loadEnv({ path: '.env.local' });

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const email = arg('email');
  const password = arg('password');

  if (!email || !password) {
    console.error('Usage: npm run seed:super-admin -- --email <email> --password <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Crear o encontrar auth.user
  let userId: string;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr) {
    // Probablemente ya existe → buscarlo y actualizar password
    const isAlreadyRegistered =
      createErr.message?.toLowerCase().includes('already') ||
      (createErr as { code?: string }).code === 'email_exists';
    if (!isAlreadyRegistered) {
      console.error('Error creating auth user:', createErr.message);
      process.exit(1);
    }

    // Buscar por email (paginar listUsers — para MVP con pocos usuarios alcanza)
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) {
      console.error('Error listing users:', listErr.message);
      process.exit(1);
    }
    const existing = list.users.find((u) => u.email === email);
    if (!existing) {
      console.error(`User ${email} not found despite "already exists" error.`);
      process.exit(1);
    }
    userId = existing.id;
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password });
    if (updErr) {
      console.error('Error updating password:', updErr.message);
      process.exit(1);
    }
    console.log(`Auth user ${email} already existed — password updated.`);
  } else {
    userId = created.user.id;
    console.log(`Auth user ${email} created.`);
  }

  // 2. Asegurar fila en super_admins (upsert)
  const { error: insErr } = await admin
    .from('super_admins')
    .upsert({ id: userId }, { onConflict: 'id' });
  if (insErr) {
    console.error('Error inserting into super_admins:', insErr.message);
    process.exit(1);
  }

  console.log(`✓ Super-admin ready: ${email} (id=${userId})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
