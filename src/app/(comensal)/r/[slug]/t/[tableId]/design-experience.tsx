'use client';

import { useEffect, useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { trackComensalEvent } from '@/lib/comensal/analytics';
import { cn } from '@/lib/utils';
import type { DesignBlock, DesignDocument } from '@/lib/validations/design';
import { DIETARY_TAG_LABELS, DIETARY_TAGS, type DietaryTag } from '@/lib/validations/menu';

import { type ComensalItem as Item, ItemCard, ItemsGrid } from './item-card';
import { ItemDetailDrawer } from './item-detail-drawer';
import { ReviewWidget } from './review-widget';
import { WaiterCallWidget } from './waiter-call-widget';

interface Category {
  id: string;
  name: string;
  position: number;
  active: boolean;
}

interface Props {
  design: DesignDocument;
  tenantName: string;
  tableNumber: string;
  logoUrl: string | null;
  welcomeMessage: string | null;
  categories: Category[];
  items: Item[];
  tableId: string;
  bonusCopy: string | null;
  /** Fuentes resueltas server-side (next/font) según design.theme. */
  fontHeadingFamily: string;
  fontBodyFamily: string;
  /** Preview del admin: sin tracking ni widgets funcionales. */
  preview?: boolean;
}

const RADIUS: Record<DesignDocument['theme']['radius'], string> = {
  square: '0rem',
  rounded: '0.625rem',
  pill: '1.25rem',
};

const DENSITY_SECTION: Record<DesignDocument['theme']['density'], string> = {
  compact: 'py-2 space-y-2',
  normal: 'py-4 space-y-3',
  relaxed: 'py-6 space-y-4',
};

const SIZE_HEADING: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
};

function overrideClasses(b: DesignBlock): string {
  const o = b.overrides ?? {};
  return cn(
    o.align === 'center' && 'text-center',
    o.hide_on === 'mobile' && 'hidden sm:block',
    o.hide_on === 'desktop' && 'sm:hidden',
  );
}

/**
 * Markdown mínimo y seguro para el bloque `text`: títulos (##, ###), **bold**,
 * *italic* y párrafos. Sin HTML crudo — todo se emite como nodos React.
 */
function MarkdownText({ markdown }: { markdown: string }) {
  const lines = markdown.split(/\r?\n/);
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        if (t.startsWith('### ')) {
          return (
            <h4 key={i} className="font-semibold" style={{ fontFamily: 'var(--df-heading)' }}>
              {renderInline(t.slice(4))}
            </h4>
          );
        }
        if (t.startsWith('## ')) {
          return (
            <h3
              key={i}
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--df-heading)' }}
            >
              {renderInline(t.slice(3))}
            </h3>
          );
        }
        return (
          <p key={i} className="text-sm">
            {renderInline(t)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  // Tokeniza **bold** y *italic* (sin anidamiento).
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

/**
 * Representación estática (no interactiva) de los widgets del sistema para el
 * preview del editor. Imita el estado colapsado de WaiterCallWidget y
 * ReviewWidget sin ejecutar su lógica (realtime, tracking, server actions).
 */
function PreviewWidgetsMock({
  brandColor,
  bonusCopy,
}: {
  brandColor: string;
  bonusCopy: string | null;
}) {
  return (
    <div className="pointer-events-none space-y-2 select-none" aria-hidden="true">
      <div
        className="w-full rounded-md px-4 py-2 text-center text-sm font-medium text-white"
        style={{ backgroundColor: brandColor }}
      >
        Llamar al mesero
      </div>
      <div className="w-full rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900">
        ⭐ Dejá una reseña{bonusCopy ? ` y ganá ${bonusCopy}` : ''}
      </div>
    </div>
  );
}

/** Facade de video (RNF-9): thumbnail estático, el iframe carga solo al tap. */
function VideoFacade({
  provider,
  videoId,
  title,
}: {
  provider: 'youtube' | 'vimeo';
  videoId: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  const src =
    provider === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`
      : `https://player.vimeo.com/video/${videoId}?autoplay=1`;

  if (playing) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-[var(--radius)]">
        <iframe
          src={src}
          title={title || 'Video'}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="relative block aspect-video w-full overflow-hidden rounded-[var(--radius)] bg-black"
      aria-label={`Reproducir video: ${title || 'video'}`}
    >
      {provider === 'youtube' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover opacity-80"
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-xl text-black shadow-lg">
          ▶
        </span>
      </span>
      {title && (
        <span className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-left text-xs text-white">
          {title}
        </span>
      )}
    </button>
  );
}

export function DesignExperience({
  design,
  tenantName,
  tableNumber,
  logoUrl,
  welcomeMessage,
  categories,
  items,
  tableId,
  bonusCopy,
  fontHeadingFamily,
  fontBodyFamily,
  preview = false,
}: Props) {
  const { theme, blocks } = design;
  const [filters, setFilters] = useState<Set<DietaryTag>>(new Set());
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Item | null>(null);

  useEffect(() => {
    if (!preview) void trackComensalEvent({ tableId, event: 'menu_loaded' });
  }, [tableId, preview]);

  const filteredItems = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const q = norm(query.trim());
    return items.filter((it) => {
      if (filters.size > 0) {
        for (const f of filters) {
          if (!(it.dietary_tags ?? []).includes(f)) return false;
        }
      }
      if (q) {
        const haystack = norm([it.name, it.description ?? '', ...(it.ingredients ?? [])].join(' '));
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, filters, query]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const firstMenuBlockId = blocks.find((b) => b.type === 'menu_category')?.id;
  const menuCategoryBlocks = blocks.filter((b) => b.type === 'menu_category');

  // Tema → CSS vars de shadcn scoped al wrapper: todos los componentes reutilizados
  // (ItemCard, widgets, drawer) heredan colores/radius sin cambios.
  const cssVars = {
    '--background': theme.colors.background,
    '--foreground': theme.colors.text,
    '--card': theme.colors.surface,
    '--card-foreground': theme.colors.text,
    '--popover': theme.colors.surface,
    '--popover-foreground': theme.colors.text,
    '--primary': theme.colors.brand,
    '--primary-foreground': '#ffffff',
    '--muted': `color-mix(in oklab, ${theme.colors.text} 6%, ${theme.colors.background})`,
    '--muted-foreground': theme.colors.muted,
    '--border': `color-mix(in oklab, ${theme.colors.text} 14%, ${theme.colors.background})`,
    '--radius': RADIUS[theme.radius],
    '--nb3d-brand': theme.colors.brand,
    '--df-heading': fontHeadingFamily,
    '--df-body': fontBodyFamily,
  } as React.CSSProperties;

  const sectionCls = DENSITY_SECTION[theme.density];

  const renderBlock = (b: DesignBlock) => {
    const oCls = overrideClasses(b);
    const size = b.overrides?.size ?? 'md';

    switch (b.type) {
      case 'hero':
        return (
          <header key={b.id} className={cn('space-y-3', sectionCls, oCls)}>
            {b.props.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.props.cover_url}
                alt=""
                className="h-40 w-full rounded-[var(--radius)] object-cover"
              />
            )}
            <div
              className={cn(
                'flex items-center gap-3',
                b.overrides?.align === 'center' && 'flex-col text-center',
              )}
            >
              {b.props.show_logo && logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={tenantName}
                  className="h-12 w-12 rounded-[var(--radius)] object-cover"
                />
              )}
              <div>
                <h1
                  className={cn('font-bold', SIZE_HEADING[size === 'md' ? 'lg' : size])}
                  style={{ fontFamily: 'var(--df-heading)' }}
                >
                  {tenantName}
                </h1>
                <p className="text-xs text-muted-foreground">Mesa {tableNumber}</p>
              </div>
            </div>
            {(b.props.headline ?? welcomeMessage) && (
              <p className="text-sm text-muted-foreground">{b.props.headline ?? welcomeMessage}</p>
            )}
          </header>
        );

      case 'menu_category': {
        const cat = categoryById.get(b.props.category_id);
        if (!cat) return null;
        const inCat = filteredItems
          .filter((it) => it.category_id === cat.id)
          .sort((a, z) => a.position - z.position);
        const template =
          b.props.layout === 'list' ? 'compact' : b.props.layout === 'grid' ? 'grid' : 'default';
        return (
          <section key={b.id} id={`cat-${cat.id}`} className={cn(sectionCls, oCls)}>
            {/* Toolbar de búsqueda/filtros antes del primer bloque de menú (RF-14) */}
            {b.id === firstMenuBlockId && (
              <div className="space-y-3 pb-2">
                <Input
                  placeholder="Buscar plato o ingrediente…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (!preview && e.target.value.length === 1) {
                      void trackComensalEvent({ tableId, event: 'search_used' });
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  {DIETARY_TAGS.map((t) => {
                    const on = filters.has(t);
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          setFilters((prev) => {
                            const next = new Set(prev);
                            if (next.has(t)) next.delete(t);
                            else next.add(t);
                            return next;
                          });
                          if (!preview) {
                            void trackComensalEvent({
                              tableId,
                              event: 'filter_used',
                              data: { tag: t, action: on ? 'remove' : 'add' },
                            });
                          }
                        }}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs',
                          on
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border text-muted-foreground',
                        )}
                      >
                        {DIETARY_TAG_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
                {menuCategoryBlocks.length > 1 && (
                  <nav className="flex gap-1 overflow-x-auto">
                    {menuCategoryBlocks.map((mb) => {
                      if (mb.type !== 'menu_category') return null;
                      const c = categoryById.get(mb.props.category_id);
                      if (!c) return null;
                      return (
                        <a
                          key={mb.id}
                          href={`#cat-${c.id}`}
                          className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                        >
                          {c.name}
                        </a>
                      );
                    })}
                  </nav>
                )}
              </div>
            )}
            <h2
              className={cn('font-semibold', SIZE_HEADING[size])}
              style={{ fontFamily: 'var(--df-heading)' }}
            >
              {cat.name}
            </h2>
            {inCat.length === 0 ? (
              <p className="rounded-[var(--radius)] border border-dashed p-4 text-center text-xs text-muted-foreground">
                Sin platos disponibles con los filtros actuales.
              </p>
            ) : (
              <ItemsGrid template={template}>
                {inCat.map((it) => (
                  <ItemCard
                    key={it.id}
                    item={it}
                    template={template}
                    onClick={() => {
                      setSelected(it);
                      if (!preview) {
                        void trackComensalEvent({
                          tableId,
                          event: 'item_view',
                          data: { item_id: it.id },
                        });
                      }
                    }}
                  />
                ))}
              </ItemsGrid>
            )}
          </section>
        );
      }

      case 'text':
        return (
          <section key={b.id} className={cn(sectionCls, oCls)}>
            <MarkdownText markdown={b.props.markdown} />
          </section>
        );

      case 'image':
        return (
          <figure key={b.id} className={cn(sectionCls, oCls)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.props.image_url}
              alt={b.props.alt}
              loading="lazy"
              className="w-full rounded-[var(--radius)] object-cover"
            />
            {b.props.caption && (
              <figcaption className="pt-1 text-xs text-muted-foreground">
                {b.props.caption}
              </figcaption>
            )}
          </figure>
        );

      case 'gallery':
        return (
          <figure key={b.id} className={cn(sectionCls, oCls)}>
            <div className="flex snap-x gap-2 overflow-x-auto pb-1">
              {b.props.image_urls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt=""
                  loading="lazy"
                  className="h-40 w-56 shrink-0 snap-start rounded-[var(--radius)] object-cover"
                />
              ))}
            </div>
            {b.props.caption && (
              <figcaption className="pt-1 text-xs text-muted-foreground">
                {b.props.caption}
              </figcaption>
            )}
          </figure>
        );

      case 'banner':
        return (
          <section key={b.id} className={cn(sectionCls, oCls)}>
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] px-4 py-3 text-white"
              style={{ backgroundColor: theme.colors.brand }}
            >
              <p className="text-sm font-medium">{b.props.text}</p>
              {b.props.cta_label && b.props.cta_url && (
                <a
                  href={b.props.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[var(--radius)] bg-white/90 px-3 py-1 text-xs font-semibold text-black"
                >
                  {b.props.cta_label}
                </a>
              )}
            </div>
          </section>
        );

      case 'button': {
        const cls =
          'inline-block rounded-[var(--radius)] px-5 py-2.5 text-sm font-semibold text-white';
        // La alineación la controla `oCls` (text-center si align=center; por
        // defecto queda a la izquierda). No forzar centrado acá.
        return (
          <section key={b.id} className={cn(sectionCls, oCls)}>
            {b.props.action === 'call_waiter' ? (
              <a
                href="#nb3d-widgets"
                className={cls}
                style={{ backgroundColor: theme.colors.brand }}
              >
                {b.props.label}
              </a>
            ) : (
              b.props.url && (
                <a
                  href={b.props.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cls}
                  style={{ backgroundColor: theme.colors.brand }}
                >
                  {b.props.label}
                </a>
              )
            )}
          </section>
        );
      }

      case 'video_embed':
        return (
          <section key={b.id} className={cn(sectionCls, oCls)}>
            <VideoFacade
              provider={b.props.provider}
              videoId={b.props.video_id}
              title={b.props.title}
            />
          </section>
        );

      case 'animation':
        return (
          <section key={b.id} className={cn(sectionCls, oCls)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.props.media_url}
              alt={b.props.alt}
              loading="lazy"
              className="w-full rounded-[var(--radius)]"
            />
          </section>
        );

      case 'footer':
        return (
          <section
            key={b.id}
            className={cn(
              'border-t pt-4 text-center text-xs text-muted-foreground',
              sectionCls,
              oCls,
            )}
          >
            <p className="font-medium">{tenantName}</p>
            {b.props.note && <p className="pt-1">{b.props.note}</p>}
          </section>
        );
    }
  };

  const bgImage = theme.background_image;
  const bgOverlay = (theme.background_overlay ?? 65) / 100;

  return (
    <div
      className={cn(
        'relative flex min-h-screen flex-col text-foreground',
        !bgImage && 'bg-background',
      )}
      style={{ ...cssVars, fontFamily: 'var(--df-body)' }}
    >
      {bgImage && (
        // Fondo fijo: imagen cubriendo el viewport + velo del color de fondo para
        // mantener legible el texto que no está dentro de cards. zIndex explícito
        // para que el contenido (zIndex 1) siempre quede por encima.
        <div className="fixed inset-0" style={{ zIndex: 0 }} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bgImage} alt="" className="h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: theme.colors.background, opacity: bgOverlay }}
          />
        </div>
      )}

      <main
        className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28"
        style={bgImage ? { position: 'relative', zIndex: 1 } : undefined}
      >
        {blocks.map(renderBlock)}
      </main>

      {/* Widgets del sistema (RF-14): siempre presentes, no removibles por el diseño.
          En preview se renderizan igual (para que el dueño vea el look real) pero
          sin interacción — la mesa es ficticia y no debe disparar llamadas/reseñas. */}
      <footer
        id="nb3d-widgets"
        className="sticky bottom-0 space-y-2 border-t bg-card px-4 py-3"
        style={bgImage ? { position: 'relative', zIndex: 1 } : undefined}
      >
        <div className="mx-auto max-w-3xl space-y-2">
          {preview ? (
            <PreviewWidgetsMock brandColor={theme.colors.brand} bonusCopy={bonusCopy} />
          ) : (
            <>
              <WaiterCallWidget tableId={tableId} brandColor={theme.colors.brand} />
              <ReviewWidget
                tableId={tableId}
                brandColor={theme.colors.brand}
                bonusCopy={bonusCopy}
              />
            </>
          )}
        </div>
      </footer>

      {selected && (
        <ItemDetailDrawer
          item={selected}
          onClose={() => setSelected(null)}
          brandColor={theme.colors.brand}
        />
      )}
    </div>
  );
}
