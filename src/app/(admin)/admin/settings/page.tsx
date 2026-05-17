import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { bonificationSettingsSchema, type BonificationSettings } from '@/lib/validations/reviews';

import { BonificationForm } from './bonification-form';
import { ReviewSettingsForm } from './review-settings-form';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const me = await requireTenantUser();

  if (me.role !== 'owner') {
    return (
      <div className="mx-auto max-w-md">
        <p className="text-sm text-muted-foreground">
          Solo el owner del restaurante puede editar la configuración.
        </p>
      </div>
    );
  }

  const settings =
    typeof me.tenant.settings === 'object' && me.tenant.settings !== null
      ? (me.tenant.settings as Record<string, unknown>)
      : {};

  const bonifParsed = bonificationSettingsSchema.safeParse(settings.bonification);
  const bonificationInit: BonificationSettings = bonifParsed.success
    ? bonifParsed.data
    : {
        type: 'discount_percent',
        value: '',
        copy: '',
        conditions: '',
        expiry_days: 30,
      };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/admin" className="text-xs text-muted-foreground hover:underline">
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-bold">Configuración del restaurante</h1>

      <Card>
        <CardHeader>
          <CardTitle>Branding y bienvenida</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initial={{
              name: me.tenant.name,
              brand_color: typeof settings.brand_color === 'string' ? settings.brand_color : '',
              logo_url: typeof settings.logo_url === 'string' ? settings.logo_url : '',
              welcome_message:
                typeof settings.welcome_message === 'string' ? settings.welcome_message : '',
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bonificación por reseña</CardTitle>
        </CardHeader>
        <CardContent>
          <BonificationForm initial={bonificationInit} hasExisting={bonifParsed.success} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reseñas</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewSettingsForm
            initial={{
              google_place_id:
                typeof settings.google_place_id === 'string' ? settings.google_place_id : '',
              review_public_threshold:
                typeof settings.review_public_threshold === 'number'
                  ? settings.review_public_threshold
                  : 4,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
