import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { NewCategoryForm } from './new-category-form';

export default function NewCategoryPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href="/admin/menu" className="text-xs text-muted-foreground hover:underline">
        ← Menú
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Nueva categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <NewCategoryForm />
        </CardContent>
      </Card>
    </div>
  );
}
