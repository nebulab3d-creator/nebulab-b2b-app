import type { DesignDocument } from '@/lib/validations/design';

/**
 * Validaciones de calidad previas a publicar (RF-12). Puras: el caller (server
 * action) arma el contexto con datos frescos de DB.
 *
 * errors   → bloquean la publicación.
 * warnings → se muestran pero no bloquean.
 *
 * Nota: la validación de contraste WCAG se removió a pedido — el dueño elige
 * libremente los colores del tema.
 */

export interface PublishContext {
  /** IDs de categorías activas del tenant (para validar referencias vivas). */
  validCategoryIds: Set<string>;
  /** IDs de categorías que no tienen ningún plato disponible (para warnings). */
  emptyCategoryIds?: Set<string>;
}

export interface PublishValidation {
  errors: string[];
  warnings: string[];
}

const MAX_ANIMATIONS = 2;

export function validatePublish(doc: DesignDocument, ctx: PublishContext): PublishValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Imagen de fondo con poco velo: el texto fuera de cards puede volverse
  // ilegible (la validación de contraste no puede ver la imagen). Advertencia.
  if (doc.theme.background_image && (doc.theme.background_overlay ?? 65) < 40) {
    warnings.push(
      'La imagen de fondo tiene poco velo — el texto sobre ella puede costar de leer. Subí el velo si no se ve bien.',
    );
  }

  // 2. Contenido mínimo: el menú tiene que estar (RF-14).
  const categoryBlocks = doc.blocks.filter((b) => b.type === 'menu_category');
  if (categoryBlocks.length === 0) {
    errors.push('El diseño debe incluir al menos un bloque de categoría del menú.');
  }

  // 3. Referencias vivas: categorías existentes y activas.
  const seenCategoryIds = new Set<string>();
  for (const b of categoryBlocks) {
    if (b.type !== 'menu_category') continue;
    if (!ctx.validCategoryIds.has(b.props.category_id)) {
      errors.push(
        'Un bloque de categoría apunta a una categoría que ya no existe o está inactiva.',
      );
    } else if (seenCategoryIds.has(b.props.category_id)) {
      warnings.push('Hay más de un bloque mostrando la misma categoría.');
    } else if (ctx.emptyCategoryIds?.has(b.props.category_id)) {
      warnings.push('Una categoría del diseño no tiene platos disponibles ahora mismo.');
    }
    seenCategoryIds.add(b.props.category_id);
  }

  // 4. Media animada: presupuesto 4G (RNF-9) — nunca above-the-fold, máximo 2.
  const animationIdx = doc.blocks
    .map((b, i) => (b.type === 'animation' ? i : -1))
    .filter((i) => i >= 0);
  if (animationIdx.length > MAX_ANIMATIONS) {
    errors.push(`Máximo ${MAX_ANIMATIONS} bloques de GIF/animación por diseño.`);
  }
  if (animationIdx.some((i) => i === 0)) {
    errors.push(
      'Los GIF/animaciones no pueden ser el primer bloque (afectan la carga inicial en 4G).',
    );
  }

  // 5. Botones de link sin URL.
  for (const b of doc.blocks) {
    if (b.type === 'button' && b.props.action === 'link' && !b.props.url) {
      errors.push(`El botón "${b.props.label}" es de tipo enlace pero no tiene URL.`);
    }
  }

  return { errors, warnings };
}
