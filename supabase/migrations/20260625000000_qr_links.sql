-- ============================================================================
-- QR dinámicos — short links editables (/q/<code>)
-- ============================================================================
-- El QR del comensal deja de codificar /r/<slug>/t/<tableId> directamente y pasa
-- a codificar una URL corta estable /q/<code>. La ruta de redirect resuelve el
-- código → destino actual (mesa o URL custom) y hace 302. Esto permite reasignar
-- el destino de un QR YA IMPRESO sin tener que reimprimirlo.
--
-- Modelo de destino (precedencia en resolve_qr_link):
--   1. target_url (override custom) si está seteado → gana
--   2. table_id → /r/<slug>/t/<tableId> (si mesa y tenant activos)
-- table_id usa ON DELETE SET NULL: si se borra la mesa, el código sobrevive
-- huérfano y el admin puede repuntarlo (o queda "no configurado" hasta entonces).
-- ============================================================================

CREATE TABLE public.qr_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code        TEXT NOT NULL UNIQUE,
  table_id    UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  target_url  TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.qr_links IS
  'Short links de QR dinámicos. code es estable; el destino (table_id o target_url) es editable.';

CREATE INDEX qr_links_tenant_idx ON public.qr_links(tenant_id);
-- Un único link "home" por mesa (los huérfanos con table_id NULL no cuentan).
CREATE UNIQUE INDEX qr_links_table_unique_idx ON public.qr_links(table_id)
  WHERE table_id IS NOT NULL;

CREATE TRIGGER qr_links_updated_at
  BEFORE UPDATE ON public.qr_links
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- resolve_qr_link — usada por la ruta pública /q/<code> (anon)
-- SECURITY DEFINER: resuelve sin exponer la tabla qr_links al rol anon.
-- Devuelve la ruta/URL destino, o NULL si inactivo / no configurado / mesa caída.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.resolve_qr_link(p_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link          public.qr_links%ROWTYPE;
  v_slug          TEXT;
  v_table_active  BOOLEAN;
  v_tenant_active BOOLEAN;
BEGIN
  SELECT * INTO v_link FROM public.qr_links WHERE code = p_code;
  IF NOT FOUND OR v_link.active = FALSE THEN
    RETURN NULL;
  END IF;

  -- 1. Override custom tiene prioridad
  IF v_link.target_url IS NOT NULL AND length(trim(v_link.target_url)) > 0 THEN
    RETURN v_link.target_url;
  END IF;

  -- 2. Mesa asociada
  IF v_link.table_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT te.slug, t.active, (te.status = 'active')
    INTO v_slug, v_table_active, v_tenant_active
    FROM public.tables t
    JOIN public.tenants te ON te.id = t.tenant_id
   WHERE t.id = v_link.table_id;

  IF v_slug IS NULL OR v_table_active = FALSE OR v_tenant_active = FALSE THEN
    RETURN NULL;
  END IF;

  RETURN '/r/' || v_slug || '/t/' || v_link.table_id::text;
END;
$$;
COMMENT ON FUNCTION public.resolve_qr_link IS
  'Devuelve el destino (ruta /r/... o target_url) de un código QR activo, o NULL.';

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.qr_links ENABLE ROW LEVEL SECURITY;

-- anon NO lee la tabla directamente: resuelve vía resolve_qr_link (SECURITY DEFINER).
CREATE POLICY qr_links_select_same_tenant_or_super
  ON public.qr_links FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());

CREATE POLICY qr_links_insert_owner_manager_or_super
  ON public.qr_links FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

CREATE POLICY qr_links_update_owner_manager_or_super
  ON public.qr_links FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

CREATE POLICY qr_links_delete_owner_manager_or_super
  ON public.qr_links FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_links TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_qr_link(TEXT) TO anon, authenticated;

-- ============================================================================
-- BACKFILL — un qr_link por cada mesa existente (para que los QR ya emitidos,
-- una vez reapuntados a /q/<code>, sigan resolviendo a su mesa).
-- ============================================================================
-- gen_random_uuid() ya está disponible (es el DEFAULT de los PKs); evitamos
-- depender de pgcrypto (gen_random_bytes). 12 chars hex del uuid sin guiones.
INSERT INTO public.qr_links (tenant_id, code, table_id)
SELECT t.tenant_id,
       substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
       t.id
FROM public.tables t;
