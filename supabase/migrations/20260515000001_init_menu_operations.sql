-- ============================================================================
-- ENG-003: Schema operacional — menú, mesas, llamadas, reseñas, analytics
-- ============================================================================
-- 6 tablas multi-tenant:
--   - menu_categories, menu_items, tables: gestionadas por tenant (CRUD)
--   - waiter_calls, reviews, analytics_events: escritas por anon (comensal)
--     con trigger que deriva tenant_id desde table_id (anon NO especifica tenant)
-- ============================================================================

-- ============================================================================
-- 1. HELPERS adicionales para RLS
-- ============================================================================

-- Quién puede modificar menú/mesas: owner o manager (no staff)
CREATE OR REPLACE FUNCTION public.is_owner_or_manager()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('owner', 'manager')
$$;
COMMENT ON FUNCTION public.is_owner_or_manager IS
  'TRUE si el usuario autenticado tiene rol owner o manager en su tenant.';

-- Validar table_id desde código anon: existe, está activa, y tenant también activo.
-- Devuelve el tenant_id de la mesa válida; lanza excepción si no.
CREATE OR REPLACE FUNCTION public.validate_table_id(p_table_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT t.tenant_id INTO v_tenant_id
    FROM public.tables t
    JOIN public.tenants te ON te.id = t.tenant_id
   WHERE t.id = p_table_id
     AND t.active = TRUE
     AND te.status = 'active';
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'invalid_table_id' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_tenant_id;
END;
$$;
COMMENT ON FUNCTION public.validate_table_id IS
  'Devuelve tenant_id de la mesa si existe y está activa (con tenant activo). Lanza excepción si no.';

-- ============================================================================
-- 2. menu_categories
-- ============================================================================
CREATE TABLE public.menu_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.menu_categories IS 'Categorías del menú (entradas, platos, bebidas, postres, etc.)';

CREATE INDEX menu_categories_tenant_position_idx ON public.menu_categories(tenant_id, position);

CREATE TRIGGER menu_categories_updated_at
  BEFORE UPDATE ON public.menu_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. menu_items
-- ============================================================================
CREATE TABLE public.menu_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  price         DECIMAL(10, 2) NOT NULL DEFAULT 0,
  image_url     TEXT,
  ingredients   TEXT[] NOT NULL DEFAULT '{}',
  dietary_tags  TEXT[] NOT NULL DEFAULT '{}',
  macros        JSONB NOT NULL DEFAULT '{}'::jsonb,
  available     BOOLEAN NOT NULL DEFAULT TRUE,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.menu_items IS 'Platos del menú (con macros, ingredientes, tags dietéticos)';

CREATE INDEX menu_items_tenant_category_idx ON public.menu_items(tenant_id, category_id);
CREATE INDEX menu_items_tenant_available_idx ON public.menu_items(tenant_id, available);

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 4. tables (mesas físicas con QR)
-- ============================================================================
CREATE TABLE public.tables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  number      TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, number)
);
COMMENT ON TABLE public.tables IS 'Mesas físicas del restaurante. URL del QR usa tables.id directamente.';

CREATE INDEX tables_tenant_active_idx ON public.tables(tenant_id, active);

CREATE TRIGGER tables_updated_at
  BEFORE UPDATE ON public.tables
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. waiter_calls
-- ============================================================================
CREATE TABLE public.waiter_calls (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_id          UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  reason            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at   TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES public.users(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.waiter_calls IS 'Llamadas al mesero. tenant_id se deriva de table_id vía trigger.';

CREATE INDEX waiter_calls_tenant_status_idx ON public.waiter_calls(tenant_id, status);
CREATE INDEX waiter_calls_table_idx ON public.waiter_calls(table_id);

-- Habilitar Realtime publication (Sprint 3 lo necesita)
ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_calls;

-- ============================================================================
-- 6. reviews
-- ============================================================================
CREATE TABLE public.reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_id          UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  rating            INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment           TEXT,
  customer_name     TEXT,
  customer_contact  TEXT,
  is_public         BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_sent        BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_code        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.reviews IS
  'Reseñas. tenant_id e is_public se derivan vía trigger (rating >= tenants.settings.review_public_threshold).';

CREATE INDEX reviews_tenant_created_idx ON public.reviews(tenant_id, created_at DESC);
CREATE INDEX reviews_tenant_public_idx ON public.reviews(tenant_id, is_public);

-- ============================================================================
-- 7. analytics_events
-- ============================================================================
CREATE TABLE public.analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_id    UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  event_data  JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.analytics_events IS 'Eventos del comensal (qr_scan, item_view, filter_used, etc). Append-only.';

CREATE INDEX analytics_events_tenant_created_idx ON public.analytics_events(tenant_id, created_at DESC);
CREATE INDEX analytics_events_tenant_type_idx ON public.analytics_events(tenant_id, event_type);

-- ============================================================================
-- 8. TRIGGERS — set_tenant_id_from_table (waiter_calls, analytics_events)
--    + review_before_insert (reviews — también setea is_public)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_tenant_id_from_table()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Override siempre (anon NO debe poder spoofear tenant_id)
  NEW.tenant_id := public.validate_table_id(NEW.table_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER waiter_calls_set_tenant_id
  BEFORE INSERT ON public.waiter_calls
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_table();

CREATE TRIGGER analytics_events_set_tenant_id
  BEFORE INSERT ON public.analytics_events
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_table();

-- reviews: setea tenant_id Y is_public en una sola vuelta
CREATE OR REPLACE FUNCTION public.review_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold INT;
BEGIN
  NEW.tenant_id := public.validate_table_id(NEW.table_id);
  SELECT COALESCE((settings ->> 'review_public_threshold')::INT, 4)
    INTO v_threshold
    FROM public.tenants
   WHERE id = NEW.tenant_id;
  NEW.is_public := (NEW.rating >= v_threshold);
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_before_insert
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.review_before_insert();

-- ============================================================================
-- 9. RLS — habilitar
-- ============================================================================
ALTER TABLE public.menu_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_calls     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. POLICIES — menu_categories
-- ============================================================================
-- anon: ve solo activas (menú público)
CREATE POLICY menu_categories_anon_select_active
  ON public.menu_categories FOR SELECT TO anon
  USING (active = TRUE);

-- authenticated: super_admin O mismo tenant
CREATE POLICY menu_categories_select_same_tenant_or_super
  ON public.menu_categories FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());

-- INSERT/UPDATE/DELETE: super_admin O (mismo tenant + role owner|manager)
CREATE POLICY menu_categories_insert_owner_manager_or_super
  ON public.menu_categories FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

CREATE POLICY menu_categories_update_owner_manager_or_super
  ON public.menu_categories FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

CREATE POLICY menu_categories_delete_owner_manager_or_super
  ON public.menu_categories FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

-- ============================================================================
-- 11. POLICIES — menu_items
-- ============================================================================
CREATE POLICY menu_items_anon_select_available
  ON public.menu_items FOR SELECT TO anon
  USING (available = TRUE);

CREATE POLICY menu_items_select_same_tenant_or_super
  ON public.menu_items FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());

CREATE POLICY menu_items_insert_owner_manager_or_super
  ON public.menu_items FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

CREATE POLICY menu_items_update_owner_manager_or_super
  ON public.menu_items FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

CREATE POLICY menu_items_delete_owner_manager_or_super
  ON public.menu_items FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

-- ============================================================================
-- 12. POLICIES — tables
-- ============================================================================
CREATE POLICY tables_anon_select_active
  ON public.tables FOR SELECT TO anon
  USING (active = TRUE);

CREATE POLICY tables_select_same_tenant_or_super
  ON public.tables FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());

CREATE POLICY tables_insert_owner_manager_or_super
  ON public.tables FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

CREATE POLICY tables_update_owner_manager_or_super
  ON public.tables FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

CREATE POLICY tables_delete_owner_manager_or_super
  ON public.tables FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

-- ============================================================================
-- 13. POLICIES — waiter_calls
-- ============================================================================
-- anon SELECT abierto (datos efímeros, sin PII; comensal ve estado de su llamada)
CREATE POLICY waiter_calls_anon_select_all
  ON public.waiter_calls FOR SELECT TO anon
  USING (TRUE);

-- anon INSERT: trigger valida table_id, RLS solo chequea que table_id no sea NULL
CREATE POLICY waiter_calls_anon_insert
  ON public.waiter_calls FOR INSERT TO anon
  WITH CHECK (table_id IS NOT NULL);

-- authenticated: super_admin O mismo tenant
CREATE POLICY waiter_calls_select_same_tenant_or_super
  ON public.waiter_calls FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());

CREATE POLICY waiter_calls_insert_same_tenant_or_super
  ON public.waiter_calls FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR tenant_id = public.current_tenant_id()
  );

-- UPDATE: cualquier usuario del tenant (staff debe poder acknowledge/resolve)
CREATE POLICY waiter_calls_update_same_tenant_or_super
  ON public.waiter_calls FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.current_tenant_id());

-- DELETE: solo super_admin (preservar audit trail)
CREATE POLICY waiter_calls_delete_super_only
  ON public.waiter_calls FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ============================================================================
-- 14. POLICIES — reviews
-- ============================================================================
-- anon: solo ve las is_public (Google reviews positivas), NO las internas
CREATE POLICY reviews_anon_select_public
  ON public.reviews FOR SELECT TO anon
  USING (is_public = TRUE);

CREATE POLICY reviews_anon_insert
  ON public.reviews FOR INSERT TO anon
  WITH CHECK (table_id IS NOT NULL);

CREATE POLICY reviews_select_same_tenant_or_super
  ON public.reviews FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());

CREATE POLICY reviews_insert_same_tenant_or_super
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR tenant_id = public.current_tenant_id()
  );

-- UPDATE: marcar bonus_sent (owner|manager only)
CREATE POLICY reviews_update_owner_manager_or_super
  ON public.reviews FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_owner_or_manager())
  );

CREATE POLICY reviews_delete_super_only
  ON public.reviews FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ============================================================================
-- 15. POLICIES — analytics_events (append-only para todos excepto super)
-- ============================================================================
-- anon: NO lee (privacidad de session_id y event_data)
CREATE POLICY analytics_events_anon_insert
  ON public.analytics_events FOR INSERT TO anon
  WITH CHECK (table_id IS NOT NULL);

CREATE POLICY analytics_events_select_same_tenant_or_super
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());

CREATE POLICY analytics_events_insert_same_tenant_or_super
  ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR tenant_id = public.current_tenant_id()
  );

-- UPDATE/DELETE: solo super_admin (eventos son inmutables)
CREATE POLICY analytics_events_update_super_only
  ON public.analytics_events FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY analytics_events_delete_super_only
  ON public.analytics_events FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ============================================================================
-- 16. GRANTS
-- ============================================================================
GRANT SELECT                            ON public.menu_categories  TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE    ON public.menu_categories  TO authenticated;

GRANT SELECT                            ON public.menu_items       TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE    ON public.menu_items       TO authenticated;

GRANT SELECT                            ON public.tables           TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE    ON public.tables           TO authenticated;

GRANT SELECT, INSERT                    ON public.waiter_calls     TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE    ON public.waiter_calls     TO authenticated;

GRANT SELECT, INSERT                    ON public.reviews          TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE    ON public.reviews          TO authenticated;

GRANT INSERT                            ON public.analytics_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE    ON public.analytics_events TO authenticated;

-- Permitir que anon llame a validate_table_id desde triggers (SECURITY DEFINER funciona,
-- pero también necesita EXECUTE explícito para invocación directa si hiciera falta)
GRANT EXECUTE ON FUNCTION public.validate_table_id(UUID) TO anon, authenticated;
