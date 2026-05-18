-- ============================================================================
-- ENG-C: Backfill `settings.onboarded_at` para tenants pre-existentes
-- ============================================================================
-- Nuevos tenants quedan con `onboarded_at` NULL → forzados al wizard.
-- Los existentes (antes de este cambio) se asumen ya onboardeados — los
-- backfilleamos con su `created_at` para que el guard del admin layout no
-- los redirija al wizard.
-- ============================================================================

UPDATE public.tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{onboarded_at}',
  to_jsonb(created_at)
)
WHERE NOT (COALESCE(settings, '{}'::jsonb) ? 'onboarded_at');
