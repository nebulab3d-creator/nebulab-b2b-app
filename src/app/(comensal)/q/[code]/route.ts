import { NextResponse, type NextRequest } from 'next/server';

import { createCacheableAnonClient } from '@/lib/supabase/cacheable';

// El destino de un QR puede cambiar en cualquier momento → nunca cachear.
export const dynamic = 'force-dynamic';

const NOT_CONFIGURED_HTML = `<!doctype html>
<html lang="es-CO"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>QR no disponible</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#111;text-align:center;padding:1.5rem}p{color:#666;max-width:28rem}</style>
</head><body><div><h1>QR no disponible</h1>
<p>Este código no está configurado o fue desactivado. Pedile al personal que te comparta el menú.</p></div></body></html>`;

export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
  const supabase = createCacheableAnonClient();
  const { data: target } = await supabase.rpc('resolve_qr_link', { p_code: params.code });

  if (!target) {
    return new NextResponse(NOT_CONFIGURED_HTML, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // `target` puede ser una ruta relativa (/r/<slug>/t/<id>) o una URL absoluta
  // (override custom). new URL(..., request.url) resuelve ambos casos.
  const destination = new URL(target, request.url);
  return NextResponse.redirect(destination, { status: 302 });
}
