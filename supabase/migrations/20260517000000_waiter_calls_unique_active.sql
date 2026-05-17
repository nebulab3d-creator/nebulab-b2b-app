-- ============================================================================
-- ENG-012: Garantiza max 1 llamada activa por mesa (a nivel DB)
-- ============================================================================
-- Una "llamada activa" = status IN ('pending', 'acknowledged')
-- Cuando la llamada pasa a 'resolved' deja de ocupar el slot → nueva llamada permitida.
-- Inmune a race conditions porque la unicidad la enforza Postgres.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS waiter_calls_one_active_per_table
  ON public.waiter_calls (table_id)
  WHERE status IN ('pending', 'acknowledged');

COMMENT ON INDEX public.waiter_calls_one_active_per_table IS
  'Max 1 llamada no-resolved por mesa. Cuando una se resuelve, libera el slot.';
