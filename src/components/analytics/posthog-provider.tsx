'use client';

import posthog from 'posthog-js';
import { PostHogProvider as Provider } from 'posthog-js/react';
import { useEffect } from 'react';

interface InitProps {
  distinctId: string | null;
  tenantId: string | null;
  tenantName: string | null;
  role: string | null;
  email: string | null;
}

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && KEY && !posthog.__loaded) {
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: 'identified_only', // crear perfil solo cuando identifiquemos
    capture_pageview: true,
    autocapture: true,
    disable_session_recording: true,
  });
}

/**
 * Mountea el provider de PostHog y aplica `identify` + `group(tenant)` cuando
 * hay sesión. SOLO debe usarse dentro de `(admin)/admin/layout.tsx` y
 * `(super-admin)/super/layout.tsx` — NO en `(comensal)` ni en `(auth)`.
 */
export function PostHogProvider({
  init,
  children,
}: {
  init: InitProps;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!KEY) return;
    if (init.distinctId) {
      posthog.identify(init.distinctId, {
        email: init.email,
        role: init.role,
      });
      if (init.tenantId) {
        posthog.group('tenant', init.tenantId, { name: init.tenantName ?? undefined });
      }
    }
    return () => {
      // No reseteamos el ID al desmontar — el next layout puede re-identificar.
    };
  }, [init.distinctId, init.tenantId, init.tenantName, init.role, init.email]);

  if (!KEY) return <>{children}</>;
  return <Provider client={posthog}>{children}</Provider>;
}
