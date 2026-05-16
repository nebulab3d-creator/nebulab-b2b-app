import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { NewTableForm } from './new-table-form';

export default function NewTablePage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href="/admin/tables" className="text-xs text-muted-foreground hover:underline">
        ← Mesas
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Nueva mesa</CardTitle>
        </CardHeader>
        <CardContent>
          <NewTableForm />
          <Link
            href="/admin/tables"
            className="mt-3 inline-block text-xs text-muted-foreground hover:underline"
          >
            <Button type="button" variant="ghost" size="sm">
              Cancelar
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
