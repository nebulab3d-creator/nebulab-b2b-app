'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon, Redo2Icon, Trash2Icon, Undo2Icon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { DesignBlock, DesignDocument, DesignTheme } from '@/lib/validations/design';
import { BLOCK_TYPE_LABELS, DESIGN_FONT_LABELS, DESIGN_FONTS } from '@/lib/validations/design';

import {
  acquireDesignLockAction,
  discardDraftAction,
  publishDesignAction,
  releaseDesignLockAction,
  saveDraftDocumentAction,
} from './actions';
import { BlockInspector } from './block-inspector';
import { selectCls } from './field-styles';
import { ImageUploadField } from './image-upload-field';
import { MenuQuickPanel, type QuickDish } from './menu-quick-panel';

interface CategoryOption {
  id: string;
  name: string;
}

const SAVE_DEBOUNCE_MS = 1200;
const HEARTBEAT_MS = 45_000;
const MAX_UNDO = 50;

const DEVICES = [
  { key: 'mobile', label: 'Móvil', width: 375 },
  { key: 'tablet', label: 'Tablet', width: 768 },
  { key: 'desktop', label: 'Desktop', width: 1180 },
] as const;

type SaveState = { kind: 'saved' } | { kind: 'saving' } | { kind: 'error'; message: string };

function blockSummary(b: DesignBlock, categories: CategoryOption[]): string {
  switch (b.type) {
    case 'menu_category':
      return categories.find((c) => c.id === b.props.category_id)?.name ?? 'categoría eliminada';
    case 'text':
      return b.props.markdown.slice(0, 36);
    case 'banner':
      return b.props.text.slice(0, 36);
    case 'button':
      return b.props.label;
    case 'video_embed':
      return b.props.title || b.props.video_id;
    default:
      return '';
  }
}

function newBlockId(): string {
  return `b-${crypto.randomUUID().slice(0, 13)}`;
}

function defaultBlock(type: DesignBlock['type'], categoryId?: string): DesignBlock | null {
  const id = newBlockId();
  switch (type) {
    case 'hero':
      return {
        id,
        type,
        props: { show_logo: true, cover_url: null, headline: null },
        overrides: {},
      };
    case 'menu_category':
      if (!categoryId) return null;
      return { id, type, props: { category_id: categoryId, layout: 'cards' }, overrides: {} };
    case 'text':
      return { id, type, props: { markdown: '## Título\nEscribí tu texto acá.' }, overrides: {} };
    case 'image':
      return {
        id,
        type,
        props: { image_url: 'https://placehold.co/600x300', alt: '', caption: null },
        overrides: {},
      };
    case 'gallery':
      return {
        id,
        type,
        props: { image_urls: ['https://placehold.co/600x400'], caption: null },
        overrides: {},
      };
    case 'banner':
      return {
        id,
        type,
        props: { text: 'Texto del banner', cta_label: null, cta_url: null },
        overrides: {},
      };
    case 'button':
      return {
        id,
        type,
        props: { action: 'call_waiter', label: 'Llamar al mesero', url: null },
        overrides: {},
      };
    case 'video_embed':
      return {
        id,
        type,
        props: { provider: 'youtube', video_id: 'XXXXXXXXXXX', title: '' },
        overrides: {},
      };
    case 'animation':
      return {
        id,
        type,
        props: { media_url: 'https://placehold.co/600x300.gif', alt: '' },
        overrides: {},
      };
    case 'footer':
      return {
        id,
        type,
        props: { show_socials: true, show_hours: true, note: null },
        overrides: {},
      };
  }
}

function SortableBlockRow({
  block,
  categories,
  selected,
  onSelect,
  onRemove,
  children,
}: {
  block: DesignBlock;
  categories: CategoryOption[];
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-md border bg-card',
        isDragging && 'z-10 opacity-80 shadow-lg',
        selected && 'border-primary',
      )}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label="Arrastrar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-baseline gap-2 text-left text-sm"
        >
          <span className="font-medium">{BLOCK_TYPE_LABELS[block.type]}</span>
          <span className="truncate text-xs text-muted-foreground">
            {blockSummary(block, categories)}
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Eliminar bloque"
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </button>
      </div>
      {selected && <div className="border-t px-3 pt-3 pb-3">{children}</div>}
    </div>
  );
}

/**
 * Editor visual del menú — Fase 2. Documento en estado de cliente con:
 * drag-and-drop (dnd-kit), inspector inline, undo/redo (Ctrl+Z / Ctrl+Shift+Z),
 * autosave debounced, lock con heartbeat + takeover, y preview en vivo por
 * postMessage (sin recargar el iframe).
 */
export function DesignEditor({
  initialDoc,
  categories,
  items,
  hasPublished,
}: {
  initialDoc: DesignDocument;
  categories: CategoryOption[];
  items: QuickDish[];
  hasPublished: boolean;
}) {
  const [doc, setDoc] = useState<DesignDocument>(initialDoc);
  // Categorías y platos en estado de cliente: se crean/editan sin recargar.
  const [cats, setCats] = useState<CategoryOption[]>(categories);
  const [dishes, setDishes] = useState<QuickDish[]>(items);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'saved' });
  const [lockHolder, setLockHolder] = useState<string | null>(null);
  const [device, setDevice] = useState<(typeof DEVICES)[number]>(DEVICES[0]);
  const [addType, setAddType] = useState<DesignBlock['type']>('text');
  const [addCategory, setAddCategory] = useState<string>(categories[0]?.id ?? '');
  const [publishing, setPublishing] = useState(false);

  const undoStack = useRef<DesignDocument[]>([]);
  const redoStack = useRef<DesignDocument[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const readOnly = lockHolder !== null;

  const postToPreview = useCallback((next: DesignDocument) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'nb3d-design-update', design: next },
      window.location.origin,
    );
  }, []);

  const saveNow = useCallback(async (next: DesignDocument): Promise<boolean> => {
    setSaveState({ kind: 'saving' });
    const r = await saveDraftDocumentAction(JSON.stringify(next));
    setSaveState(r.ok ? { kind: 'saved' } : { kind: 'error', message: r.error });
    return r.ok;
  }, []);

  const scheduleSave = useCallback(
    (next: DesignDocument) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void saveNow(next);
      }, SAVE_DEBOUNCE_MS);
    },
    [saveNow],
  );

  /** Fuerza el guardado pendiente (antes de publicar: nunca publicar stale). */
  const flushSave = useCallback(async (): Promise<boolean> => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      return await saveNow(docRef.current);
    }
    return true;
  }, [saveNow]);

  async function publish() {
    setPublishing(true);
    try {
      const flushed = await flushSave();
      if (!flushed) {
        toast.error('No se pudo guardar el borrador; corregí el error antes de publicar.');
        return;
      }
      const r = await publishDesignAction(null, new FormData());
      if (r?.ok === false) {
        for (const line of r.error.split('\n')) toast.error(line);
        return;
      }
      // Navegación dura para refrescar el encabezado ("Versión N publicada") sin
      // la transición soft. El toast se muestra tras recargar (sessionStorage).
      sessionStorage.setItem(
        'nb3d-publish-toast',
        JSON.stringify({ message: r?.message ?? 'Diseño publicado', warnings: r?.warnings ?? [] }),
      );
      window.location.assign('/admin/design');
      return;
    } finally {
      setPublishing(false);
    }
  }

  async function discard() {
    const msg = hasPublished
      ? '¿Descartar los cambios del borrador y volver al diseño publicado?'
      : '¿Eliminar el borrador? No hay diseño publicado, volverás al selector de plantillas.';
    if (!window.confirm(msg)) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const r = await discardDraftAction(null, new FormData());
    if (r?.ok === false) {
      toast.error(r.error);
      return;
    }
    // Navegación dura: refleja el estado nuevo (editor reseteado o selector de
    // plantillas) sin depender de la transición soft.
    window.location.assign('/admin/design');
  }

  const apply = useCallback(
    (next: DesignDocument) => {
      undoStack.current.push(docRef.current);
      if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
      redoStack.current = [];
      setDoc(next);
      postToPreview(next);
      scheduleSave(next);
    },
    [postToPreview, scheduleSave],
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(docRef.current);
    setDoc(prev);
    postToPreview(prev);
    scheduleSave(prev);
  }, [postToPreview, scheduleSave]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(docRef.current);
    setDoc(next);
    postToPreview(next);
    scheduleSave(next);
  }, [postToPreview, scheduleSave]);

  // Atajos de teclado: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      // No interceptar undo nativo mientras se escribe en un input.
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // Toast diferido tras publicar (venimos de una navegación dura).
  useEffect(() => {
    const raw = sessionStorage.getItem('nb3d-publish-toast');
    if (!raw) return;
    sessionStorage.removeItem('nb3d-publish-toast');
    try {
      const { message, warnings } = JSON.parse(raw) as { message?: string; warnings?: string[] };
      if (message) toast.success(message);
      for (const w of warnings ?? []) toast.warning(w);
    } catch {
      // ignorar payload corrupto
    }
  }, []);

  // Lock: adquirir al montar, heartbeat periódico, liberar al salir (RF-13).
  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      const r = await acquireDesignLockAction();
      if (cancelled) return;
      setLockHolder(r.ok ? null : (r.holder ?? 'otro usuario'));
    }
    void acquire();
    const interval = setInterval(() => void acquire(), HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      void releaseDesignLockAction();
    };
  }, []);

  // El preview avisa cuando está listo (carga/recarga del iframe) → sync.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if ((e.data as { type?: string })?.type === 'nb3d-preview-ready') {
        postToPreview(docRef.current);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [postToPreview]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = doc.blocks.findIndex((b) => b.id === active.id);
    const to = doc.blocks.findIndex((b) => b.id === over.id);
    if (from < 0 || to < 0) return;
    apply({ ...doc, blocks: arrayMove(doc.blocks, from, to) });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const patchTheme = (theme: DesignTheme) => apply({ ...doc, theme });

  /** Inserta un bloque antes del footer (posición natural) y lo selecciona. */
  function insertBlock(block: DesignBlock) {
    const blocks = [...doc.blocks];
    const last = blocks[blocks.length - 1];
    if (last?.type === 'footer' && block.type !== 'footer') {
      blocks.splice(blocks.length - 1, 0, block);
    } else {
      blocks.push(block);
    }
    apply({ ...doc, blocks });
    setSelectedId(block.id);
  }

  function addBlock() {
    const block = defaultBlock(addType, addCategory || undefined);
    if (!block) return;
    insertBlock(block);
  }

  function removeBlock(id: string) {
    if (doc.blocks.length <= 1) return;
    if (!window.confirm('¿Eliminar este bloque?')) return;
    apply({ ...doc, blocks: doc.blocks.filter((b) => b.id !== id) });
    if (selectedId === id) setSelectedId(null);
  }

  /** Recarga el iframe de preview (para reflejar platos recién creados). */
  function reloadPreview() {
    try {
      iframeRef.current?.contentWindow?.location.reload();
    } catch {
      // Si el reload directo fallara, forzar recarga cambiando el src.
      if (iframeRef.current) iframeRef.current.src = '/admin/design/preview';
    }
  }

  /** Categoría creada desde el panel de menú: la agrego al estado y creo su bloque. */
  function handleCategoryCreated(cat: CategoryOption) {
    setCats((prev) => [...prev, cat]);
    setAddCategory((prev) => prev || cat.id);
    insertBlock({
      id: newBlockId(),
      type: 'menu_category',
      props: { category_id: cat.id, layout: 'cards' },
      overrides: {},
    });
  }

  function handleDishCreated(dish: QuickDish) {
    setDishes((prev) => [...prev, dish]);
    reloadPreview();
  }

  function handleDishImageChanged(itemId: string, imageUrl: string | null) {
    setDishes((prev) => prev.map((d) => (d.id === itemId ? { ...d, image_url: imageUrl } : d)));
    reloadPreview();
  }

  /** Categoría que ya existe pero no tiene bloque: la agrego al diseño. */
  function handleAddCategoryToDesign(categoryId: string) {
    insertBlock({
      id: newBlockId(),
      type: 'menu_category',
      props: { category_id: categoryId, layout: 'cards' },
      overrides: {},
    });
  }

  // category_ids que ya se muestran (tienen un bloque menu_category en el diseño).
  const categoriesInDesign = new Set(
    doc.blocks.flatMap((b) => (b.type === 'menu_category' ? [b.props.category_id] : [])),
  );

  return (
    <div className="space-y-4">
      {readOnly && (
        <Alert variant="destructive">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <b>{lockHolder}</b> está editando el diseño en este momento. Podés mirar, pero no
              editar.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (
                  !window.confirm(
                    '¿Tomar el control? La otra persona perderá su sesión de edición.',
                  )
                )
                  return;
                const r = await acquireDesignLockAction(true);
                if (r.ok) setLockHolder(null);
              }}
            >
              Tomar el control
            </Button>
          </div>
        </Alert>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={undo} disabled={readOnly} title="Ctrl+Z">
          <Undo2Icon className="h-4 w-4" /> Deshacer
        </Button>
        <Button size="sm" variant="outline" onClick={redo} disabled={readOnly} title="Ctrl+Shift+Z">
          <Redo2Icon className="h-4 w-4" /> Rehacer
        </Button>
        <span
          className={cn(
            'text-xs',
            saveState.kind === 'error' ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {saveState.kind === 'saved' && 'Guardado'}
          {saveState.kind === 'saving' && 'Guardando…'}
          {saveState.kind === 'error' && `No se guardó: ${saveState.message}`}
        </span>
        <Button size="sm" onClick={() => void publish()} disabled={readOnly || publishing}>
          {publishing ? 'Publicando…' : 'Publicar diseño'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void discard()} disabled={readOnly}>
          Descartar cambios
        </Button>
        <div className="ml-auto flex items-center gap-1">
          {DEVICES.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDevice(d)}
              className={cn(
                'rounded-full px-3 py-1 text-xs',
                device.key === d.key
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Columna izquierda: tema + bloques */}
        <fieldset disabled={readOnly} className="min-w-0 space-y-4 lg:col-span-2">
          <div className="rounded-md border bg-card p-4">
            <h3 className="pb-3 text-sm font-semibold">Identidad visual</h3>
            <ThemePanel theme={doc.theme} onChange={patchTheme} />
          </div>

          <div className="rounded-md border bg-card p-4">
            <h3 className="pb-3 text-sm font-semibold">Categorías y platos</h3>
            <MenuQuickPanel
              categories={cats}
              dishes={dishes}
              categoriesInDesign={categoriesInDesign}
              onCategoryCreated={handleCategoryCreated}
              onDishCreated={handleDishCreated}
              onDishImageChanged={handleDishImageChanged}
              onAddCategoryToDesign={handleAddCategoryToDesign}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Bloques</h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={doc.blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {doc.blocks.map((b) => (
                    <SortableBlockRow
                      key={b.id}
                      block={b}
                      categories={cats}
                      selected={selectedId === b.id}
                      onSelect={() => setSelectedId(selectedId === b.id ? null : b.id)}
                      onRemove={() => removeBlock(b.id)}
                    >
                      <BlockInspector
                        block={b}
                        categories={cats}
                        onChange={(next) =>
                          apply({
                            ...doc,
                            blocks: doc.blocks.map((x) => (x.id === next.id ? next : x)),
                          })
                        }
                      />
                    </SortableBlockRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed p-3">
              <div className="min-w-32 flex-1 space-y-1">
                <Label className="text-xs">Agregar bloque</Label>
                <select
                  className={selectCls}
                  value={addType}
                  onChange={(e) => setAddType(e.target.value as DesignBlock['type'])}
                >
                  {(Object.keys(BLOCK_TYPE_LABELS) as Array<DesignBlock['type']>).map((t) => (
                    <option key={t} value={t}>
                      {BLOCK_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              {addType === 'menu_category' && (
                <div className="min-w-32 flex-1 space-y-1">
                  <Label className="text-xs">Categoría</Label>
                  <select
                    className={selectCls}
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                  >
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button size="sm" onClick={addBlock}>
                Agregar
              </Button>
            </div>
          </div>
        </fieldset>

        {/* Columna derecha: preview en vivo */}
        <div className="lg:col-span-3">
          <div className="overflow-x-auto rounded-md border bg-muted/30 p-4">
            <iframe
              ref={iframeRef}
              src="/admin/design/preview"
              title="Preview del diseño"
              style={{ width: device.width }}
              className="mx-auto h-[700px] max-w-full rounded-md border bg-white shadow-sm"
            />
          </div>
          <p className="pt-2 text-xs text-muted-foreground">
            Preview en vivo del borrador con los datos reales del menú. Los cambios se reflejan al
            instante y se guardan solos.
          </p>
        </div>
      </div>
    </div>
  );
}

function ThemePanel({
  theme,
  onChange,
}: {
  theme: DesignTheme;
  onChange: (t: DesignTheme) => void;
}) {
  const colorFields: Array<{ key: keyof DesignTheme['colors']; label: string }> = [
    { key: 'brand', label: 'Marca' },
    { key: 'background', label: 'Fondo' },
    { key: 'surface', label: 'Cards' },
    { key: 'text', label: 'Texto' },
    { key: 'muted', label: 'Atenuado' },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {colorFields.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label className="text-[11px]">{f.label}</Label>
            <input
              type="color"
              value={theme.colors[f.key]}
              onChange={(e) =>
                onChange({ ...theme, colors: { ...theme.colors, [f.key]: e.target.value } })
              }
              className="h-8 w-full cursor-pointer rounded-md border border-input bg-transparent px-0.5"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px]">Títulos</Label>
          <select
            className={selectCls}
            value={theme.font_heading}
            onChange={(e) =>
              onChange({ ...theme, font_heading: e.target.value as DesignTheme['font_heading'] })
            }
          >
            {DESIGN_FONTS.map((f) => (
              <option key={f} value={f}>
                {DESIGN_FONT_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Texto</Label>
          <select
            className={selectCls}
            value={theme.font_body}
            onChange={(e) =>
              onChange({ ...theme, font_body: e.target.value as DesignTheme['font_body'] })
            }
          >
            {DESIGN_FONTS.map((f) => (
              <option key={f} value={f}>
                {DESIGN_FONT_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Bordes</Label>
          <select
            className={selectCls}
            value={theme.radius}
            onChange={(e) =>
              onChange({ ...theme, radius: e.target.value as DesignTheme['radius'] })
            }
          >
            <option value="square">Cuadrados</option>
            <option value="rounded">Redondeados</option>
            <option value="pill">Muy redondeados</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Espaciado</Label>
          <select
            className={selectCls}
            value={theme.density}
            onChange={(e) =>
              onChange({ ...theme, density: e.target.value as DesignTheme['density'] })
            }
          >
            <option value="compact">Denso</option>
            <option value="normal">Normal</option>
            <option value="relaxed">Relajado</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[11px]">Imagen de fondo</Label>
          <div className="flex items-center gap-2">
            {theme.background_image && (
              <button
                type="button"
                className="text-[11px] text-muted-foreground underline"
                onClick={() => onChange({ ...theme, background_image: null })}
              >
                Quitar
              </button>
            )}
            <ImageUploadField
              buttonLabel={theme.background_image ? 'Cambiar' : 'Subir imagen'}
              onUploaded={(url) => onChange({ ...theme, background_image: url })}
            />
          </div>
        </div>
        {theme.background_image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={theme.background_image}
              alt="Fondo del menú"
              className="h-20 w-full rounded-md object-cover"
            />
            <div className="space-y-1">
              <Label className="text-[11px]">
                Velo sobre la imagen ({theme.background_overlay}%)
              </Label>
              <input
                type="range"
                min={0}
                max={100}
                value={theme.background_overlay}
                onChange={(e) => onChange({ ...theme, background_overlay: Number(e.target.value) })}
                className="w-full"
              />
              <p className="text-[11px] text-muted-foreground">
                Más velo = texto más legible. Menos velo = se ve más la imagen.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
