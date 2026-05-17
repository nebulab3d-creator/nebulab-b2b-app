-- ============================================================================
-- ENG-016: reviews.redeemed_at + index para anti-fraude
-- ============================================================================
-- PRD §RF-3.3: "1 bonificación por contacto cada X días (configurable)".
-- El check lo hace la app antes de emitir; el index acelera el lookup.
-- ============================================================================

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.reviews.redeemed_at IS
  'Cuando el restaurante marca el código como redimido. NULL = pendiente.';

-- Para chequeo de anti-fraude: ¿este contacto ya tuvo bonus_sent en últimos N días?
CREATE INDEX IF NOT EXISTS reviews_tenant_contact_created_idx
  ON public.reviews (tenant_id, customer_contact, created_at DESC)
  WHERE customer_contact IS NOT NULL;
