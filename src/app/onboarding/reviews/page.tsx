import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireTenantUser } from '@/lib/auth/require-tenant';

import { ReviewsStepForm } from './reviews-form';

export default async function OnboardingReviewsPage() {
  const me = await requireTenantUser(['owner']);
  const settings =
    typeof me.tenant.settings === 'object' && me.tenant.settings !== null
      ? (me.tenant.settings as Record<string, unknown>)
      : {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paso 2 de 3 · Bonificación y reseñas</CardTitle>
        <CardDescription>
          Definí qué recompensa ofrecés a quienes dejan reseña (opcional) y el threshold público.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ReviewsStepForm
          initial={{
            review_public_threshold:
              typeof settings.review_public_threshold === 'number'
                ? settings.review_public_threshold
                : 4,
            google_place_id:
              typeof settings.google_place_id === 'string' ? settings.google_place_id : '',
          }}
        />
      </CardContent>
    </Card>
  );
}
