-- ============================================================================
-- ENG-011: anon puede SELECT tenants activos por slug (público para comensal)
-- ============================================================================
-- Sin esta policy, el comensal no puede resolver `slug → tenant.id`.
-- Restringimos a status='active' para que los suspended/cancelled no carguen.
-- ============================================================================

CREATE POLICY tenants_anon_select_active
  ON public.tenants FOR SELECT TO anon
  USING (status = 'active');

GRANT SELECT ON public.tenants TO anon;
