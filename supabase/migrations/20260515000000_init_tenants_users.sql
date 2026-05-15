-- ============================================================================
-- ENG-002: Schema inicial — tenants, users, super_admins + RLS
-- ============================================================================
-- Modelo multi-tenant single-DB con aislamiento por tenant_id vía RLS.
-- Todos los helpers de RLS son SECURITY DEFINER para evitar recursión sobre
-- las tablas que las propias policies protegen (users, super_admins).
-- ============================================================================

-- 1. HELPER: trigger para updated_at (reusado en todas las tablas con la columna)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. TABLA tenants — un restaurante = un tenant
-- ============================================================================
CREATE TABLE public.tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'basic',
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'suspended', 'cancelled')),
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.tenants IS 'Restaurantes cliente del SaaS Nebulab3D';

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. TABLA users — perfil de tenant (1 usuario = 1 tenant)
-- ============================================================================
CREATE TABLE public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  full_name             TEXT NOT NULL,
  email                 TEXT NOT NULL,
  must_change_password  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.users IS 'Perfil de usuario de tenant — espejo de auth.users con role + tenant_id';

CREATE INDEX users_tenant_id_idx ON public.users(tenant_id);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 4. TABLA super_admins — staff interno Nebulab3D (cross-tenant)
-- ============================================================================
CREATE TABLE public.super_admins (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.super_admins IS 'Staff interno Nebulab3D con acceso cross-tenant';

-- ============================================================================
-- 5. HELPERS SQL para RLS
-- ============================================================================
-- SECURITY DEFINER + search_path explícito (anti CVE-2018-1058) son OBLIGATORIOS:
-- evitan recursión RLS al consultar users/super_admins desde dentro de policies
-- sobre esas mismas tablas, y blindan contra search_path hijack.

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
$$;
COMMENT ON FUNCTION public.current_tenant_id IS
  'Tenant del usuario autenticado. NULL si no es usuario de tenant.';

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
$$;
COMMENT ON FUNCTION public.is_super_admin IS
  'TRUE si el usuario autenticado es staff interno Nebulab3D.';

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;
COMMENT ON FUNCTION public.current_user_role IS
  'Rol (owner|manager|staff) del usuario autenticado en su tenant. NULL si no aplica.';

-- ============================================================================
-- 6. RLS — habilitar
-- ============================================================================
ALTER TABLE public.tenants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. POLICIES — tenants
-- ============================================================================
-- SELECT: super_admin ve todos; usuario regular solo el propio
CREATE POLICY tenants_select_own_or_super
  ON public.tenants FOR SELECT TO authenticated
  USING (public.is_super_admin() OR id = public.current_tenant_id());

-- INSERT/UPDATE/DELETE: solo super_admin (los tenants se crean desde el panel interno)
CREATE POLICY tenants_insert_super_only
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY tenants_update_super_only
  ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY tenants_delete_super_only
  ON public.tenants FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ============================================================================
-- 8. POLICIES — users
-- ============================================================================
-- SELECT: super_admin O mismo tenant (todos los roles ven a sus compañeros)
CREATE POLICY users_select_same_tenant_or_super
  ON public.users FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());

-- INSERT/UPDATE/DELETE: super_admin O 'owner' del mismo tenant
CREATE POLICY users_insert_owner_or_super
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.current_user_role() = 'owner')
  );

CREATE POLICY users_update_owner_or_super
  ON public.users FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.current_user_role() = 'owner')
  )
  WITH CHECK (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.current_user_role() = 'owner')
  );

CREATE POLICY users_delete_owner_or_super
  ON public.users FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (tenant_id = public.current_tenant_id() AND public.current_user_role() = 'owner')
  );

-- ============================================================================
-- 9. POLICIES — super_admins (lockdown total: solo super_admins)
-- ============================================================================
CREATE POLICY super_admins_select_super_only
  ON public.super_admins FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY super_admins_insert_super_only
  ON public.super_admins FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY super_admins_update_super_only
  ON public.super_admins FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY super_admins_delete_super_only
  ON public.super_admins FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ============================================================================
-- 10. GRANTS
-- ============================================================================
-- service_role bypassea RLS automáticamente. anon NO accede a estas tablas.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_admins TO authenticated;

-- ============================================================================
-- BOOTSTRAP: el primer super_admin debe crearse vía service_role tras crear
-- el auth.user en Supabase Dashboard (o auth.admin.createUser):
--   INSERT INTO public.super_admins (id) VALUES ('<auth.users.id>');
-- A partir de ese momento, los siguientes super_admin se crean desde el panel.
-- ============================================================================
