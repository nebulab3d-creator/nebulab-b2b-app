import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { FirstTableForm } from './first-table-form';

export default function OnboardingFirstTablePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Paso 4 de 4 · Tu primera mesa</CardTitle>
        <CardDescription>
          Creá tu primera mesa para generar su QR. Vas a poder agregar más mesas desde el panel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FirstTableForm />
      </CardContent>
    </Card>
  );
}
