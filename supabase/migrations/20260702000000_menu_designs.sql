-- ============================================================================
-- Editor Visual del Menú · Fase 1 — menu_designs
-- ============================================================================
-- Diseños del menú del comensal como documento JSONB versionado
-- ({ schema_version, theme, blocks }). Ver docs/EDITOR-VISUAL-MENU.md.
--
-- Invariantes (aplicadas por server actions, respaldadas por índices parciales):
--   - ≤1 draft y ≤1 published por tenant.
--   - Publicar = archivar el published actual y clonar el draft como published.
--   - Revert = clonar una archived como nuevo published.
--   - Los DATOS del menú (menu_items/categories) NO se versionan: el bloque
--     menu_category referencia category_id y se resuelve en vivo al renderizar.
--
-- Lock de edición (RF-13): lease en locked_by/locked_at con TTL de 2 minutos
-- renovado por heartbeat. Solo aplica a la fila draft.
-- ============================================================================

CREATE TABLE public.menu_designs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published', 'archived')),
  design        JSONB NOT NULL DEFAULT '{}'::jsonb,
  version       INTEGER NOT NULL DEFAULT 1,
  published_at  TIMESTAMPTZ,
  published_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  locked_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  locked_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.menu_designs IS
  'Diseños del menú del comensal (tema + bloques, JSONB). draft/published/archived por tenant.';

CREATE UNIQUE INDEX menu_designs_tenant_draft_idx
  ON public.menu_designs(tenant_id) WHERE status = 'draft';
CREATE UNIQUE INDEX menu_designs_tenant_published_idx
  ON public.menu_designs(tenant_id) WHERE status = 'published';
CREATE INDEX menu_designs_tenant_archived_idx
  ON public.menu_designs(tenant_id, published_at DESC) WHERE status = 'archived';

CREATE TRIGGER menu_designs_updated_at
  BEFORE UPDATE ON public.menu_designs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.menu_designs ENABLE ROW LEVEL SECURITY;

-- anon NO lee la tabla: el comensal recibe el diseño ya renderizado server-side
-- (fetch con cliente anon cacheable NO aplica acá — el fetch del diseño publicado
-- se hace con el service-role-less server client bajo el tenant del slug vía
-- política anon de published, ver abajo).
--
-- Nota: el renderer del comensal necesita leer el diseño published de un tenant
-- activo sin sesión. Permitimos SELECT anon SOLO de filas published de tenants
-- activos (el documento de diseño es contenido público por definición).
CREATE POLICY menu_designs_anon_select_published
  ON public.menu_designs FOR SELECT TO anon
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.tenants te
       WHERE te.id = tenant_id AND te.status = 'active'
    )
  );

CREATE POLICY menu_designs_select_same_tenant_or_super
  ON public.menu_designs FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());

CREATE POLICY menu_designs_insert_owner_manager_or_super
  ON public.menu_designs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

CREATE POLICY menu_designs_update_owner_manager_or_super
  ON public.menu_designs FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

CREATE POLICY menu_designs_delete_owner_manager_or_super
  ON public.menu_designs FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT ON public.menu_designs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_designs TO authenticated;
