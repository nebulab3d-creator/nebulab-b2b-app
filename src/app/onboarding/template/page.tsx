import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { MENU_TEMPLATES, type MenuTemplate } from '@/lib/validations/menu';

import { TemplateStepForm } from './template-form';

export default async function OnboardingTemplatePage() {
  const me = await requireTenantUser(['owner']);
  const settings =
    typeof me.tenant.settings === 'object' && me.tenant.settings !== null
      ? (me.tenant.settings as Record<string, unknown>)
      : {};

  const current: MenuTemplate = MENU_TEMPLATES.includes(settings.menu_template as MenuTemplate)
    ? (settings.menu_template as MenuTemplate)
    : 'default';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paso 3 de 4 · Plantilla del menú</CardTitle>
        <CardDescription>
          Elegí cómo se ve el menú a tus comensales. Podés cambiar después en Configuración.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TemplateStepForm initial={current} />
      </CardContent>
    </Card>
  );
}
