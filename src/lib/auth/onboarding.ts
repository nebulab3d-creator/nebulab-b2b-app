import type { TenantUser } from './types';

export const ONBOARDING_STEPS = ['branding', 'reviews', 'template', 'first-table'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const NEXT_STEP: Record<OnboardingStep, OnboardingStep | null> = {
  branding: 'reviews',
  reviews: 'template',
  template: 'first-table',
  'first-table': null, // final → /admin
};

export const STEP_LABELS: Record<OnboardingStep, string> = {
  branding: 'Branding y bienvenida',
  reviews: 'Bonificación y reseñas',
  template: 'Plantilla del menú',
  'first-table': 'Primera mesa',
};

/** Lee `settings.onboarded_at` del tenant. NULL = no onboardeado todavía. */
export function readOnboardedAt(settings: TenantUser['tenant']['settings']): string | null {
  if (typeof settings !== 'object' || settings === null) return null;
  const v = (settings as Record<string, unknown>).onboarded_at;
  return typeof v === 'string' && v.length > 0 ? v : null;
}
