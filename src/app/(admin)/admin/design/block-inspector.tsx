'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DesignBlock } from '@/lib/validations/design';

import { selectCls } from './field-styles';
import { ImageUploadField } from './image-upload-field';

interface CategoryOption {
  id: string;
  name: string;
}

const textareaCls =
  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/**
 * Inspector de propiedades del bloque seleccionado (Fase 2). Controlado:
 * cada cambio emite el bloque completo vía onChange → undo/autosave/preview.
 */
export function BlockInspector({
  block,
  categories,
  onChange,
}: {
  block: DesignBlock;
  categories: CategoryOption[];
  onChange: (next: DesignBlock) => void;
}) {
  // Helpers con narrowing por tipo: p() emite props parciales del mismo tipo.
  const patch = (props: DesignBlock['props']) => onChange({ ...block, props } as DesignBlock);
  const patchOverrides = (key: 'size' | 'align' | 'hide_on', value: string) => {
    const overrides = { ...block.overrides };
    if (value === '') delete overrides[key];
    else (overrides as Record<string, string>)[key] = value;
    onChange({ ...block, overrides } as DesignBlock);
  };

  return (
    <div className="space-y-3">
      <PropsFields block={block} categories={categories} patch={patch} />

      <div className="grid grid-cols-3 gap-2 border-t pt-3">
        <Field label="Tamaño">
          <select
            className={selectCls}
            value={block.overrides?.size ?? ''}
            onChange={(e) => patchOverrides('size', e.target.value)}
          >
            <option value="">Normal</option>
            <option value="sm">Chico</option>
            <option value="lg">Grande</option>
          </select>
        </Field>
        <Field label="Alineación">
          <select
            className={selectCls}
            value={block.overrides?.align ?? ''}
            onChange={(e) => patchOverrides('align', e.target.value)}
          >
            <option value="">Izquierda</option>
            <option value="center">Centrado</option>
          </select>
        </Field>
        <Field label="Ocultar en">
          <select
            className={selectCls}
            value={block.overrides?.hide_on ?? ''}
            onChange={(e) => patchOverrides('hide_on', e.target.value)}
          >
            <option value="">Nunca</option>
            <option value="mobile">Móvil</option>
            <option value="desktop">Desktop</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

function PropsFields({
  block,
  categories,
  patch,
}: {
  block: DesignBlock;
  categories: CategoryOption[];
  patch: (props: DesignBlock['props']) => void;
}) {
  switch (block.type) {
    case 'hero': {
      const p = block.props;
      return (
        <>
          <Field label="Titular (opcional)">
            <Input
              value={p.headline ?? ''}
              maxLength={120}
              placeholder="Ej: ¡Bienvenidos!"
              onChange={(e) => patch({ ...p, headline: e.target.value || null })}
            />
          </Field>
          <Field label="Imagen de portada (opcional)">
            <div className="flex items-center gap-2">
              <Input
                value={p.cover_url ?? ''}
                placeholder="URL o subí una imagen"
                onChange={(e) => patch({ ...p, cover_url: e.target.value || null })}
              />
              <ImageUploadField onUploaded={(url) => patch({ ...p, cover_url: url })} />
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={p.show_logo}
              onChange={(e) => patch({ ...p, show_logo: e.target.checked })}
            />
            Mostrar logo
          </label>
        </>
      );
    }
    case 'menu_category': {
      const p = block.props;
      return (
        <>
          <Field label="Categoría">
            <select
              className={selectCls}
              value={p.category_id}
              onChange={(e) => patch({ ...p, category_id: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Layout">
            <select
              className={selectCls}
              value={p.layout}
              onChange={(e) => patch({ ...p, layout: e.target.value as typeof p.layout })}
            >
              <option value="cards">Cards con foto</option>
              <option value="list">Lista compacta</option>
              <option value="grid">Grid 2 columnas</option>
            </select>
          </Field>
        </>
      );
    }
    case 'text': {
      const p = block.props;
      return (
        <Field label="Texto (## título, **negrita**, *cursiva*)">
          <textarea
            className={textareaCls}
            rows={4}
            maxLength={4000}
            value={p.markdown}
            onChange={(e) => patch({ ...p, markdown: e.target.value })}
          />
        </Field>
      );
    }
    case 'image': {
      const p = block.props;
      return (
        <>
          <Field label="Imagen">
            <div className="flex items-center gap-2">
              <Input
                value={p.image_url}
                placeholder="URL o subí una imagen"
                onChange={(e) => patch({ ...p, image_url: e.target.value })}
              />
              <ImageUploadField onUploaded={(url) => patch({ ...p, image_url: url })} />
            </div>
          </Field>
          <Field label="Texto alternativo">
            <Input
              value={p.alt}
              maxLength={200}
              onChange={(e) => patch({ ...p, alt: e.target.value })}
            />
          </Field>
          <Field label="Pie de foto (opcional)">
            <Input
              value={p.caption ?? ''}
              maxLength={200}
              onChange={(e) => patch({ ...p, caption: e.target.value || null })}
            />
          </Field>
        </>
      );
    }
    case 'gallery': {
      const p = block.props;
      return (
        <>
          <Field label="URLs de imágenes (una por línea, máx 10)">
            <textarea
              className={textareaCls}
              rows={4}
              value={p.image_urls.join('\n')}
              onChange={(e) =>
                patch({
                  ...p,
                  image_urls: e.target.value
                    .split(/\r?\n/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
          <ImageUploadField
            buttonLabel="Subir y agregar a la galería"
            onUploaded={(url) => patch({ ...p, image_urls: [...p.image_urls, url].slice(0, 10) })}
          />
          <Field label="Pie de galería (opcional)">
            <Input
              value={p.caption ?? ''}
              maxLength={200}
              onChange={(e) => patch({ ...p, caption: e.target.value || null })}
            />
          </Field>
        </>
      );
    }
    case 'banner': {
      const p = block.props;
      return (
        <>
          <Field label="Texto del banner">
            <Input
              value={p.text}
              maxLength={200}
              onChange={(e) => patch({ ...p, text: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Botón (opcional)">
              <Input
                value={p.cta_label ?? ''}
                maxLength={40}
                onChange={(e) => patch({ ...p, cta_label: e.target.value || null })}
              />
            </Field>
            <Field label="URL del botón">
              <Input
                value={p.cta_url ?? ''}
                onChange={(e) => patch({ ...p, cta_url: e.target.value || null })}
              />
            </Field>
          </div>
        </>
      );
    }
    case 'button': {
      const p = block.props;
      return (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Acción">
              <select
                className={selectCls}
                value={p.action}
                onChange={(e) => patch({ ...p, action: e.target.value as typeof p.action })}
              >
                <option value="call_waiter">Llamar al mesero</option>
                <option value="link">Abrir enlace</option>
              </select>
            </Field>
            <Field label="Etiqueta">
              <Input
                value={p.label}
                maxLength={40}
                onChange={(e) => patch({ ...p, label: e.target.value })}
              />
            </Field>
          </div>
          {p.action === 'link' && (
            <Field label="URL del enlace">
              <Input
                value={p.url ?? ''}
                onChange={(e) => patch({ ...p, url: e.target.value || null })}
              />
            </Field>
          )}
        </>
      );
    }
    case 'video_embed': {
      const p = block.props;
      return (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Plataforma">
              <select
                className={selectCls}
                value={p.provider}
                onChange={(e) => patch({ ...p, provider: e.target.value as typeof p.provider })}
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
              </select>
            </Field>
            <Field label="ID del video">
              <Input
                value={p.video_id}
                maxLength={40}
                onChange={(e) => patch({ ...p, video_id: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Título (opcional)">
            <Input
              value={p.title}
              maxLength={120}
              onChange={(e) => patch({ ...p, title: e.target.value })}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            El ID es la parte final de la URL: youtube.com/watch?v=<b>ID</b>
          </p>
        </>
      );
    }
    case 'animation': {
      const p = block.props;
      return (
        <>
          <Field label="GIF / WebP animado (máx 4MB)">
            <div className="flex items-center gap-2">
              <Input
                value={p.media_url}
                placeholder="URL o subí un GIF"
                onChange={(e) => patch({ ...p, media_url: e.target.value })}
              />
              <ImageUploadField
                buttonLabel="Subir GIF"
                accept="image/gif,image/webp"
                onUploaded={(url) => patch({ ...p, media_url: url })}
              />
            </div>
          </Field>
          <Field label="Texto alternativo">
            <Input
              value={p.alt}
              maxLength={200}
              onChange={(e) => patch({ ...p, alt: e.target.value })}
            />
          </Field>
        </>
      );
    }
    case 'footer': {
      const p = block.props;
      return (
        <Field label="Nota del pie (opcional)">
          <Input
            value={p.note ?? ''}
            maxLength={280}
            onChange={(e) => patch({ ...p, note: e.target.value || null })}
          />
        </Field>
      );
    }
  }
}
