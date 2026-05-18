import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireTenantUser } from '@/lib/auth/require-tenant';

import { BrandingStepForm } from './branding-form';

export default async function OnboardingBrandingPage() {
  const me = await requireTenantUser(['owner']);
  const settings =
    typeof me.tenant.settings === 'object' && me.tenant.settings !== null
      ? (me.tenant.settings as Record<string, unknown>)
      : {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paso 1 de 4 · Branding y bienvenida</CardTitle>
        <CardDescription>
          Cómo se ve tu restaurante a los comensales cuando escanean el QR.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BrandingStepForm
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
  );
}
