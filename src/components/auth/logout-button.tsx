'use client';

import { signOutAction } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <Button variant="ghost" size="sm" type="submit">
        Salir
      </Button>
    </form>
  );
}
