'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import type { TenantUser } from '@/lib/auth/types';
import { buildPresetDocument, DESIGN_PRESETS, type DesignPreset } from '@/lib/design/presets';
import { validatePublish } from '@/lib/design/validate-publish';
import { createClient } from '@/lib/supabase/server';
import {
  designDocumentSchema,
  parseDesignDocument,
  type DesignBlock,
  type DesignDocument,
} from '@/lib/validations/design';
import {
  addBlockFormSchema,
  blockOverridesFormSchema,
  blockPropsFormSchemas,
  blockRefSchema,
  moveBlockFormSchema,
} from '@/lib/validations/design-forms';

export type DesignActionResult =
  | { ok: false; error: string }
  | { ok: true; message?: string; warnings?: string[] }
  | null;

const flatten = (issues: { message: string }[]): string => issues.map((i) => i.message).join(' · ');

const LOCK_TTL_MS = 2 * 60 * 1000;
const MAX_ARCHIVED = 10;

type Supabase = ReturnType<typeof createClient>;

/**
 * Carga el draft del tenant adquiriendo/renovando el lock de edición (RF-13).
 * Lease: el lock se toma si está libre, vencido (TTL 2 min) o ya es nuestro.
 * Cada action mutadora pasa por acá → guardar renueva el lease.
 */
async function loadDraftWithLock(
  supabase: Supabase,
  me: TenantUser,
): Promise<{ ok: true; draftId: string; doc: DesignDocument } | { ok: false; error: string }> {
  const { data: draft } = await supabase
    .from('menu_designs')
    .select('id, design, locked_by, locked_at')
    .eq('tenant_id', me.tenant.id)
    .eq('status', 'draft')
    .maybeSingle();
  if (!draft) return { ok: false, error: 'No hay borrador. Creá uno desde una plantilla.' };

  const cutoff = new Date(Date.now() - LOCK_TTL_MS).toISOString();
  const { data: locked } = await supabase
    .from('menu_designs')
    .update({ locked_by: me.profile.id, locked_at: new Date().toISOString() })
    .eq('id', draft.id)
    .or(`locked_by.is.null,locked_by.eq.${me.profile.id},locked_at.lt.${cutoff}`)
    .select('id')
    .maybeSingle();
  if (!locked) {
    return { ok: false, error: 'Otro usuario está editando el diseño en este momento.' };
  }

  const doc = parseDesignDocument(draft.design);
  if (!doc) return { ok: false, error: 'El borrador está corrupto. Creá uno nuevo.' };
  return { ok: true, draftId: draft.id, doc };
}

async function saveDraft(
  supabase: Supabase,
  draftId: string,
  doc: DesignDocument,
): Promise<string | null> {
  const parsed = designDocumentSchema.safeParse(doc);
  if (!parsed.success) return flatten(parsed.error.issues);
  const { error } = await supabase
    .from('menu_designs')
    .update({ design: parsed.data })
    .eq('id', draftId);
  return error ? error.message : null;
}

// ─────────────────────── Editor en vivo (Fase 2, llamada directa) ───────────

export type SaveDocumentResult = { ok: true } | { ok: false; error: string };

/**
 * Guarda el documento COMPLETO del borrador (autosave del editor drag-and-drop).
 * Valida Zod + renueva el lock en cada guardado.
 */
export async function saveDraftDocumentAction(designJson: string): Promise<SaveDocumentResult> {
  const me = await requireTenantUser(['owner', 'manager']);

  let raw: unknown;
  try {
    raw = JSON.parse(designJson);
  } catch {
    return { ok: false, error: 'Documento inválido' };
  }
  const parsed = designDocumentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const supabase = createClient();
  const loaded = await loadDraftWithLock(supabase, me);
  if (!loaded.ok) return loaded;

  const err = await saveDraft(supabase, loaded.draftId, parsed.data);
  if (err) return { ok: false, error: err };
  return { ok: true };
}

export type LockResult =
  | { ok: true }
  | { ok: false; holder: string | null }
  | { ok: false; holder: null; error: string };

/**
 * Adquiere/renueva el lock del borrador (heartbeat del editor, RF-13).
 * `force` toma el control aunque otro usuario tenga el lease vigente.
 */
export async function acquireDesignLockAction(force = false): Promise<LockResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const supabase = createClient();

  const { data: draft } = await supabase
    .from('menu_designs')
    .select('id, locked_by, locked_at')
    .eq('tenant_id', me.tenant.id)
    .eq('status', 'draft')
    .maybeSingle();
  if (!draft) return { ok: false, holder: null, error: 'No hay borrador' };

  const cutoff = new Date(Date.now() - LOCK_TTL_MS).toISOString();
  let query = supabase
    .from('menu_designs')
    .update({ locked_by: me.profile.id, locked_at: new Date().toISOString() })
    .eq('id', draft.id);
  if (!force) {
    query = query.or(`locked_by.is.null,locked_by.eq.${me.profile.id},locked_at.lt.${cutoff}`);
  }
  const { data: locked } = await query.select('id').maybeSingle();
  if (locked) return { ok: true };

  // Lock en manos de otro: resolver nombre para la UI de presencia.
  let holder: string | null = null;
  if (draft.locked_by) {
    const { data: u } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', draft.locked_by)
      .maybeSingle();
    holder = u?.full_name || u?.email || null;
  }
  return { ok: false, holder };
}

/** Libera el lock si es nuestro (al salir del editor). */
export async function releaseDesignLockAction(): Promise<void> {
  const me = await requireTenantUser(['owner', 'manager']);
  const supabase = createClient();
  await supabase
    .from('menu_designs')
    .update({ locked_by: null, locked_at: null })
    .eq('tenant_id', me.tenant.id)
    .eq('status', 'draft')
    .eq('locked_by', me.profile.id);
}

// ─────────────────────────── Draft desde preset ─────────────────────────

export async function createDraftFromPresetAction(preset: string): Promise<DesignActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  if (!DESIGN_PRESETS.includes(preset as DesignPreset)) {
    return { ok: false, error: 'Plantilla inválida' };
  }

  const supabase = createClient();
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('id, name')
    .eq('tenant_id', me.tenant.id)
    .eq('active', true)
    .order('position', { ascending: true });

  const doc = buildPresetDocument(preset as DesignPreset, categories ?? []);
  const { error } = await supabase.from('menu_designs').insert({
    tenant_id: me.tenant.id,
    status: 'draft',
    design: doc,
  });
  if (error) {
    return {
      ok: false,
      error: error.code === '23505' ? 'Ya existe un borrador' : error.message,
    };
  }
  // Sin revalidatePath: el cliente hace una navegación dura a /admin/design, que
  // monta el editor de forma fiable (la transición soft entra en refetch-loop).
  return { ok: true, message: 'Borrador creado' };
}

/** Crea el borrador clonando el diseño publicado (para retomar la edición). */
export async function createDraftFromPublishedAction(): Promise<DesignActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const supabase = createClient();

  const { data: published } = await supabase
    .from('menu_designs')
    .select('design')
    .eq('tenant_id', me.tenant.id)
    .eq('status', 'published')
    .maybeSingle();
  if (!published) return { ok: false, error: 'No hay diseño publicado' };

  const doc = parseDesignDocument(published.design);
  if (!doc) return { ok: false, error: 'El diseño publicado no es compatible con el editor' };

  const { error } = await supabase.from('menu_designs').insert({
    tenant_id: me.tenant.id,
    status: 'draft',
    design: doc,
  });
  if (error) {
    return { ok: false, error: error.code === '23505' ? 'Ya existe un borrador' : error.message };
  }
  // El cliente hace navegación dura tras crear (evita el refetch-loop soft).
  return { ok: true, message: 'Borrador creado desde el diseño publicado' };
}

// ─────────────────────────── Bloques ─────────────────────────

let blockSeq = 0;
function newBlockId(): string {
  blockSeq += 1;
  return `b-${Date.now().toString(36)}-${blockSeq}`;
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

export async function addBlockAction(
  _prev: DesignActionResult,
  formData: FormData,
): Promise<DesignActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = addBlockFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };
  if (parsed.data.type === 'menu_category' && !parsed.data.category_id) {
    return { ok: false, error: 'Elegí la categoría para el bloque de menú' };
  }

  const supabase = createClient();
  const loaded = await loadDraftWithLock(supabase, me);
  if (!loaded.ok) return loaded;

  const block = defaultBlock(parsed.data.type, parsed.data.category_id || undefined);
  if (!block) return { ok: false, error: 'Tipo de bloque inválido' };

  // Insertar antes del footer si es el último bloque (posición natural).
  const blocks = [...loaded.doc.blocks];
  const last = blocks[blocks.length - 1];
  if (last?.type === 'footer' && block.type !== 'footer') {
    blocks.splice(blocks.length - 1, 0, block);
  } else {
    blocks.push(block);
  }
  loaded.doc.blocks = blocks;

  const err = await saveDraft(supabase, loaded.draftId, loaded.doc);
  if (err) return { ok: false, error: err };
  revalidatePath('/admin/design');
  return { ok: true, message: 'Bloque agregado' };
}

export async function updateBlockAction(
  _prev: DesignActionResult,
  formData: FormData,
): Promise<DesignActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const ref = blockRefSchema.safeParse(Object.fromEntries(formData));
  if (!ref.success) return { ok: false, error: 'Bloque inválido' };

  const supabase = createClient();
  const loaded = await loadDraftWithLock(supabase, me);
  if (!loaded.ok) return loaded;

  const idx = loaded.doc.blocks.findIndex((b) => b.id === ref.data.block_id);
  const block = idx >= 0 ? loaded.doc.blocks[idx] : undefined;
  if (!block) return { ok: false, error: 'El bloque ya no existe en el borrador' };

  const propsSchema = blockPropsFormSchemas[block.type];
  const parsedProps = propsSchema.safeParse(Object.fromEntries(formData));
  if (!parsedProps.success) return { ok: false, error: flatten(parsedProps.error.issues) };

  const parsedOverrides = blockOverridesFormSchema.safeParse(Object.fromEntries(formData));
  const o = parsedOverrides.success ? parsedOverrides.data : {};
  const overrides = {
    ...(o.size ? { size: o.size } : {}),
    ...(o.align === 'center' ? { align: o.align } : {}),
    ...(o.hide_on ? { hide_on: o.hide_on } : {}),
  };

  // Normalizar strings vacíos del form a null/defaults según el tipo.
  const p = parsedProps.data as Record<string, unknown>;
  const nullIfEmpty = (v: unknown) => (v === '' ? null : v);
  let next: DesignBlock;
  switch (block.type) {
    case 'hero':
      next = {
        ...block,
        overrides,
        props: {
          headline: nullIfEmpty(p.headline) as string | null,
          cover_url: nullIfEmpty(p.cover_url) as string | null,
          show_logo: Boolean(p.show_logo),
        },
      };
      break;
    case 'menu_category':
      next = {
        ...block,
        overrides,
        props: {
          category_id: p.category_id as string,
          layout: p.layout as 'cards' | 'list' | 'grid',
        },
      };
      break;
    case 'text':
      next = { ...block, overrides, props: { markdown: p.markdown as string } };
      break;
    case 'image':
      next = {
        ...block,
        overrides,
        props: {
          image_url: p.image_url as string,
          alt: (p.alt as string) || '',
          caption: nullIfEmpty(p.caption) as string | null,
        },
      };
      break;
    case 'gallery':
      next = {
        ...block,
        overrides,
        props: {
          image_urls: p.image_urls as string[],
          caption: nullIfEmpty(p.caption) as string | null,
        },
      };
      break;
    case 'banner':
      next = {
        ...block,
        overrides,
        props: {
          text: p.text as string,
          cta_label: nullIfEmpty(p.cta_label) as string | null,
          cta_url: nullIfEmpty(p.cta_url) as string | null,
        },
      };
      break;
    case 'button':
      next = {
        ...block,
        overrides,
        props: {
          action: p.action as 'call_waiter' | 'link',
          label: p.label as string,
          url: nullIfEmpty(p.url) as string | null,
        },
      };
      break;
    case 'video_embed':
      next = {
        ...block,
        overrides,
        props: {
          provider: p.provider as 'youtube' | 'vimeo',
          video_id: p.video_id as string,
          title: (p.title as string) || '',
        },
      };
      break;
    case 'animation':
      next = {
        ...block,
        overrides,
        props: { media_url: p.media_url as string, alt: (p.alt as string) || '' },
      };
      break;
    case 'footer':
      next = {
        ...block,
        overrides,
        props: { ...block.props, note: nullIfEmpty(p.note) as string | null },
      };
      break;
  }

  loaded.doc.blocks[idx] = next;
  const err = await saveDraft(supabase, loaded.draftId, loaded.doc);
  if (err) return { ok: false, error: err };
  revalidatePath('/admin/design');
  return { ok: true, message: 'Bloque guardado' };
}

export async function moveBlockAction(
  _prev: DesignActionResult,
  formData: FormData,
): Promise<DesignActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = moveBlockFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Movimiento inválido' };

  const supabase = createClient();
  const loaded = await loadDraftWithLock(supabase, me);
  if (!loaded.ok) return loaded;

  const blocks = [...loaded.doc.blocks];
  const idx = blocks.findIndex((b) => b.id === parsed.data.block_id);
  if (idx < 0) return { ok: false, error: 'El bloque ya no existe' };
  const to = parsed.data.direction === 'up' ? idx - 1 : idx + 1;
  const a = blocks[idx];
  const b = blocks[to];
  if (!a || !b) return { ok: true };
  blocks[idx] = b;
  blocks[to] = a;
  loaded.doc.blocks = blocks;

  const err = await saveDraft(supabase, loaded.draftId, loaded.doc);
  if (err) return { ok: false, error: err };
  revalidatePath('/admin/design');
  return { ok: true };
}

export async function removeBlockAction(
  _prev: DesignActionResult,
  formData: FormData,
): Promise<DesignActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = blockRefSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Bloque inválido' };

  const supabase = createClient();
  const loaded = await loadDraftWithLock(supabase, me);
  if (!loaded.ok) return loaded;

  const next = loaded.doc.blocks.filter((b) => b.id !== parsed.data.block_id);
  if (next.length === 0) return { ok: false, error: 'El diseño no puede quedar vacío' };
  loaded.doc.blocks = next;

  const err = await saveDraft(supabase, loaded.draftId, loaded.doc);
  if (err) return { ok: false, error: err };
  revalidatePath('/admin/design');
  return { ok: true, message: 'Bloque eliminado' };
}

// ─────────────────────────── Publicar / revertir ─────────────────────────

export async function publishDesignAction(
  _prev: DesignActionResult,
  _formData: FormData,
): Promise<DesignActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const supabase = createClient();
  const loaded = await loadDraftWithLock(supabase, me);
  if (!loaded.ok) return loaded;

  // Contexto fresco para validaciones (RF-12).
  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from('menu_categories').select('id').eq('tenant_id', me.tenant.id).eq('active', true),
    supabase
      .from('menu_items')
      .select('category_id')
      .eq('tenant_id', me.tenant.id)
      .eq('available', true),
  ]);
  const validCategoryIds = new Set((categories ?? []).map((c) => c.id));
  const withItems = new Set((items ?? []).map((i) => i.category_id).filter(Boolean) as string[]);
  const emptyCategoryIds = new Set([...validCategoryIds].filter((id) => !withItems.has(id)));

  const { errors, warnings } = validatePublish(loaded.doc, { validCategoryIds, emptyCategoryIds });
  if (errors.length > 0) return { ok: false, error: errors.join('\n') };

  // Publicar: archivar el published actual → clonar draft como nuevo published.
  const { data: current } = await supabase
    .from('menu_designs')
    .select('id, version')
    .eq('tenant_id', me.tenant.id)
    .eq('status', 'published')
    .maybeSingle();

  if (current) {
    const { error } = await supabase
      .from('menu_designs')
      .update({ status: 'archived' })
      .eq('id', current.id);
    if (error) return { ok: false, error: error.message };
  }

  const { error: insertError } = await supabase.from('menu_designs').insert({
    tenant_id: me.tenant.id,
    status: 'published',
    design: loaded.doc,
    version: (current?.version ?? 0) + 1,
    published_at: new Date().toISOString(),
    published_by: me.profile.id,
  });
  if (insertError) {
    // Restaurar el published archivado para no dejar al tenant sin diseño.
    if (current) {
      await supabase.from('menu_designs').update({ status: 'published' }).eq('id', current.id);
    }
    return { ok: false, error: insertError.message };
  }

  // Retención: conservar las últimas MAX_ARCHIVED archivadas.
  const { data: archived } = await supabase
    .from('menu_designs')
    .select('id')
    .eq('tenant_id', me.tenant.id)
    .eq('status', 'archived')
    .order('published_at', { ascending: false, nullsFirst: false });
  const toDelete = (archived ?? []).slice(MAX_ARCHIVED).map((r) => r.id);
  if (toDelete.length > 0) {
    await supabase.from('menu_designs').delete().in('id', toDelete);
  }

  // Solo invalida el menú del comensal. No revalidatePath('/admin/design'): el
  // editor hace navegación dura tras publicar (la transición soft entra en loop).
  revalidateTag(`tenant-design-by-slug:${me.tenant.slug}`);
  return {
    ok: true,
    message: 'Diseño publicado',
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export async function revertDesignAction(
  _prev: DesignActionResult,
  formData: FormData,
): Promise<DesignActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const archivedId = formData.get('archived_id');
  if (typeof archivedId !== 'string' || !archivedId)
    return { ok: false, error: 'Versión inválida' };

  const supabase = createClient();
  const { data: archived } = await supabase
    .from('menu_designs')
    .select('id, design')
    .eq('id', archivedId)
    .eq('tenant_id', me.tenant.id)
    .eq('status', 'archived')
    .maybeSingle();
  if (!archived) return { ok: false, error: 'La versión no existe' };

  const doc = parseDesignDocument(archived.design);
  if (!doc) return { ok: false, error: 'Esa versión no es compatible con el editor actual' };

  const { data: current } = await supabase
    .from('menu_designs')
    .select('id, version')
    .eq('tenant_id', me.tenant.id)
    .eq('status', 'published')
    .maybeSingle();
  if (current) {
    const { error } = await supabase
      .from('menu_designs')
      .update({ status: 'archived' })
      .eq('id', current.id);
    if (error) return { ok: false, error: error.message };
  }

  const { error } = await supabase.from('menu_designs').insert({
    tenant_id: me.tenant.id,
    status: 'published',
    design: doc,
    version: (current?.version ?? 0) + 1,
    published_at: new Date().toISOString(),
    published_by: me.profile.id,
  });
  if (error) {
    if (current) {
      await supabase.from('menu_designs').update({ status: 'published' }).eq('id', current.id);
    }
    return { ok: false, error: error.message };
  }

  // El cliente hace navegación dura; solo invalidamos el menú del comensal.
  revalidateTag(`tenant-design-by-slug:${me.tenant.slug}`);
  return { ok: true, message: 'Versión restaurada y publicada' };
}

/** Vuelve el borrador al estado del published actual (descartar cambios). */
export async function discardDraftAction(
  _prev: DesignActionResult,
  _formData: FormData,
): Promise<DesignActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const supabase = createClient();
  const loaded = await loadDraftWithLock(supabase, me);
  if (!loaded.ok) return loaded;

  const { data: published } = await supabase
    .from('menu_designs')
    .select('design')
    .eq('tenant_id', me.tenant.id)
    .eq('status', 'published')
    .maybeSingle();

  if (published) {
    const doc = parseDesignDocument(published.design);
    if (!doc) return { ok: false, error: 'El diseño publicado no es compatible' };
    const err = await saveDraft(supabase, loaded.draftId, doc);
    if (err) return { ok: false, error: err };
  } else {
    const { error } = await supabase.from('menu_designs').delete().eq('id', loaded.draftId);
    if (error) return { ok: false, error: error.message };
  }

  // El cliente hace navegación dura tras descartar.
  return { ok: true, message: 'Cambios descartados' };
}
