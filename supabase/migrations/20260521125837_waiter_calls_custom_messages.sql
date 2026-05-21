-- ============================================================================
-- ENG-XXX: Cambiar waiter_calls.reason de enum a texto libre (<100 chars)
-- ============================================================================
-- ANTES: reason VARCHAR con CHECK enum ['pedir', 'cuenta', 'otro']
-- AHORA: reason TEXT con límite de longitud vía app (DB permite NULL/libre)
--
-- El trigger set_tenant_id_from_table ya setea tenant_id, no cambia nada ahí.
-- ============================================================================

-- Alterar la columna: remover check constraint y permitir TEXT libre
-- PostgreSQL no tiene forma de "dropar" un CHECK por nombre si no se sabe,
-- así que usamos una máquina más quirúrgica: creamos una columna temporal,
-- migramos, y luego renombramos.

-- Opción A (más segura): crear columna temporal, copiar, dropar, renombrar
-- Pero como la constraint es inline (CHECK (status IN (...))), hacemos:

-- 1. Crear columna temporal con el tipo correcto
ALTER TABLE public.waiter_calls ADD COLUMN reason_temp TEXT;

-- 2. Copiar datos existentes (mantener viejos valores 'pedir'/'cuenta'/'otro')
UPDATE public.waiter_calls SET reason_temp = reason;

-- 3. Dropear la columna vieja (que tenía el CHECK)
ALTER TABLE public.waiter_calls DROP COLUMN reason;

-- 4. Renombrar la temporal
ALTER TABLE public.waiter_calls RENAME COLUMN reason_temp TO reason;

-- 5. Agregar constraint de longitud máxima como comentario (el app layer lo valida via Zod)
COMMENT ON COLUMN public.waiter_calls.reason IS
  'Razón de la llamada. Texto libre (<100 chars). NULL si el comensal no especifica.';

-- No hay cambios en RLS, policies, triggers, o índices — todo sigue igual.
-- El comensal sigue insertando con anon perms, el trigger sigue seteando tenant_id.
