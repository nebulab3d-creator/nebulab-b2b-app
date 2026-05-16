-- ============================================================================
-- ENG-008: Storage bucket `menu-images`
-- ============================================================================
-- Bucket público (URLs sin firmar para que Next/Image las consuma directo).
-- Writes solo via service_role (admin client) — sin policies para anon/authenticated.
-- Limite 5MB por archivo, MIME types restringidos.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  TRUE,
  5242880,                                          -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ningún policy en storage.objects para este bucket — lecturas son públicas
-- por el flag `public=true`, y escrituras pasan por service_role (bypass RLS).
