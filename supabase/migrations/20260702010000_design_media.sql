-- ============================================================================
-- Editor Visual · pipeline de media (RNF-11)
-- ============================================================================
-- 1. El bucket `menu-images` acepta GIF (bloque animation del editor).
-- 2. Función para calcular el uso de storage de un tenant (quota por plan).
-- ============================================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'
]
WHERE id = 'menu-images';

-- Suma de bytes de los objetos del bucket menu-images bajo el prefijo del
-- tenant (`<tenant_id>/...`). storage.objects.metadata->>'size' es el tamaño.
-- SECURITY DEFINER: storage.objects no es accesible via PostgREST por defecto.
-- Solo la invoca el server (service_role / authenticated del tenant).
CREATE OR REPLACE FUNCTION public.tenant_storage_bytes(p_tenant_id UUID)
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT COALESCE(SUM((metadata ->> 'size')::BIGINT), 0)
    FROM storage.objects
   WHERE bucket_id = 'menu-images'
     AND name LIKE p_tenant_id::text || '/%';
$$;
COMMENT ON FUNCTION public.tenant_storage_bytes IS
  'Bytes usados por un tenant en el bucket menu-images (quota RNF-11).';

GRANT EXECUTE ON FUNCTION public.tenant_storage_bytes(UUID) TO authenticated, service_role;
