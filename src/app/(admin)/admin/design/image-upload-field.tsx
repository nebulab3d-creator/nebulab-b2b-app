'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Spinner } from '@/components/ui/spinner';

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;
const MAX_GIF_BYTES = 4 * 1024 * 1024;

/**
 * Redimensiona una imagen raster en el browser (canvas) y la convierte a WebP.
 * Los GIF se suben tal cual (el canvas perdería la animación) con límite duro.
 */
async function prepareFile(file: File): Promise<File | { error: string }> {
  if (file.type === 'image/gif') {
    if (file.size > MAX_GIF_BYTES) {
      return { error: 'El GIF supera 4MB. Usá uno más liviano (afecta la carga en 4G).' };
    }
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { error: 'No se pudo procesar la imagen' };
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
    );
    if (!blob) return { error: 'No se pudo convertir la imagen' };
    return new File([blob], 'imagen.webp', { type: 'image/webp' });
  } catch {
    return { error: 'El archivo no parece ser una imagen válida' };
  }
}

export function ImageUploadField({
  onUploaded,
  accept = 'image/jpeg,image/png,image/webp',
  buttonLabel = 'Subir imagen',
}: {
  onUploaded: (url: string) => void;
  accept?: string;
  buttonLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const prepared = await prepareFile(file);
      if (!(prepared instanceof File)) {
        toast.error(prepared.error);
        return;
      }
      const body = new FormData();
      body.append('file', prepared);
      const res = await fetch('/admin/design/upload', { method: 'POST', body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'No se pudo subir la imagen');
        return;
      }
      onUploaded(json.url);
      toast.success('Imagen subida');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      {uploading ? <Spinner className="h-3.5 w-3.5" /> : null}
      {uploading ? 'Subiendo…' : buttonLabel}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
    </label>
  );
}
