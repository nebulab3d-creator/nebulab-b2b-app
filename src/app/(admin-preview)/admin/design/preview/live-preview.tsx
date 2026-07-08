'use client';

import { useEffect, useState } from 'react';

import { DesignExperience } from '@/app/(comensal)/r/[slug]/t/[tableId]/design-experience';
import type { ComensalItem } from '@/app/(comensal)/r/[slug]/t/[tableId]/item-card';
import type { DesignDocument, DesignFont } from '@/lib/validations/design';
import { parseDesignDocument } from '@/lib/validations/design';

interface Category {
  id: string;
  name: string;
  position: number;
  active: boolean;
}

/**
 * Preview EN VIVO del editor (RF-11 + Fase 2): renderiza el borrador servido y
 * escucha postMessage same-origin del editor para re-renderizar al instante,
 * sin recargar el iframe.
 */
export function LivePreview({
  initialDesign,
  tenantName,
  logoUrl,
  welcomeMessage,
  categories,
  items,
  fontFamilies,
}: {
  initialDesign: DesignDocument;
  tenantName: string;
  logoUrl: string | null;
  welcomeMessage: string | null;
  categories: Category[];
  items: ComensalItem[];
  fontFamilies: Record<DesignFont, string>;
}) {
  const [design, setDesign] = useState<DesignDocument>(initialDesign);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; design?: unknown };
      if (data?.type !== 'nb3d-design-update') return;
      const doc = parseDesignDocument(data.design);
      if (doc) setDesign(doc);
    }
    window.addEventListener('message', onMessage);
    // Avisar al editor que el preview está listo para recibir updates.
    window.parent?.postMessage({ type: 'nb3d-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <DesignExperience
      design={design}
      tenantName={tenantName}
      tableNumber="1"
      logoUrl={logoUrl}
      welcomeMessage={welcomeMessage}
      categories={categories}
      items={items}
      tableId=""
      bonusCopy={null}
      fontHeadingFamily={fontFamilies[design.theme.font_heading]}
      fontBodyFamily={fontFamilies[design.theme.font_body]}
      preview
    />
  );
}
