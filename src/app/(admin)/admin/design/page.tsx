import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';
import { parseDesignDocument } from '@/lib/validations/design';

import { CreateFromPublishedButton } from './create-from-published-button';
import { DesignEditor } from './design-editor';
import { PresetPicker } from './preset-picker';
import { VersionHistory } from './publish-controls';

export default async function DesignPage() {
  const me = await requireTenantUser();
  const canEdit = me.role === 'owner' || me.role === 'manager';

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Diseño del menú</h1>
        <p className="pt-4 text-sm text-muted-foreground">
          Solo owner o manager puede editar el diseño.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const [
    { data: draft },
    { data: published },
    { data: archived },
    { data: categories },
    { data: items },
  ] = await Promise.all([
    supabase
      .from('menu_designs')
      .select('id, design, updated_at')
      .eq('tenant_id', me.tenant.id)
      .eq('status', 'draft')
      .maybeSingle(),
    supabase
      .from('menu_designs')
      .select('id, version, published_at')
      .eq('tenant_id', me.tenant.id)
      .eq('status', 'published')
      .maybeSingle(),
    supabase
      .from('menu_designs')
      .select('id, version, published_at')
      .eq('tenant_id', me.tenant.id)
      .eq('status', 'archived')
      .order('published_at', { ascending: false }),
    supabase
      .from('menu_categories')
      .select('id, name')
      .eq('tenant_id', me.tenant.id)
      .eq('active', true)
      .order('position', { ascending: true }),
    supabase
      .from('menu_items')
      .select('id, name, category_id, image_url')
      .eq('tenant_id', me.tenant.id)
      .order('position', { ascending: true }),
  ]);

  const doc = draft ? parseDesignDocument(draft.design) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Diseño del menú</h1>
          <p className="text-sm text-muted-foreground">
            {published
              ? `Versión ${published.version} publicada${
                  published.published_at
                    ? ` el ${new Date(published.published_at).toLocaleDateString('es-CO')}`
                    : ''
                }.`
              : 'Tu menú usa el diseño clásico. Publicá un diseño para personalizarlo.'}
          </p>
        </div>
      </div>

      {!draft && (
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle>{published ? 'Editar el diseño' : 'Elegí una plantilla'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {published && <CreateFromPublishedButton />}
            <PresetPicker />
          </CardContent>
        </Card>
      )}

      {draft && !doc && (
        <Alert variant="destructive">
          El borrador guardado no es compatible con esta versión del editor. Descartalo y creá uno
          nuevo desde una plantilla.
        </Alert>
      )}

      {doc && (
        <>
          {/* key SOLO por id (estable). NO incluir updated_at: cada server action
              (autosave, lock) refresca la ruta por defecto y el trigger bumpea
              updated_at → si estuviera en la key, el editor remonta, re-dispara el
              lock, refresca de nuevo… bucle infinito. Discard cambia el id del
              borrador (delete+recreate) para forzar el remount cuando hace falta. */}
          <DesignEditor
            key={draft?.id}
            initialDoc={doc}
            categories={categories ?? []}
            items={items ?? []}
            hasPublished={Boolean(published)}
          />

          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Historial de versiones</CardTitle>
            </CardHeader>
            <CardContent>
              <VersionHistory versions={archived ?? []} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
