import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';

import { RedeemForm } from './redeem-form';

type Filter = 'all' | 'positive' | 'negative' | 'pending_bonus' | 'with_code';

export default async function ReviewsPage({ searchParams }: { searchParams: { filter?: string } }) {
  await requireTenantUser();
  const filter: Filter = (
    ['all', 'positive', 'negative', 'pending_bonus', 'with_code'] as Filter[]
  ).includes(searchParams.filter as Filter)
    ? (searchParams.filter as Filter)
    : 'all';

  const supabase = createClient();
  let q = supabase
    .from('reviews')
    .select(
      'id, rating, comment, customer_name, customer_contact, is_public, bonus_sent, bonus_code, redeemed_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filter === 'positive') q = q.gte('rating', 4);
  else if (filter === 'negative') q = q.lte('rating', 3);
  else if (filter === 'pending_bonus') q = q.eq('bonus_sent', false);
  else if (filter === 'with_code') q = q.not('bonus_code', 'is', null);

  const { data: reviews } = await q;

  const counts = await fetchCounts(supabase);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reseñas</h1>
          <p className="text-sm text-muted-foreground">
            {reviews?.length ?? 0} resultado{(reviews?.length ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        <FilterLink current={filter} value="all" label={`Todas (${counts.all})`} />
        <FilterLink
          current={filter}
          value="positive"
          label={`Positivas 4-5★ (${counts.positive})`}
        />
        <FilterLink
          current={filter}
          value="negative"
          label={`⚠️ Negativas 1-3★ (${counts.negative})`}
        />
        <FilterLink current={filter} value="with_code" label={`Con código (${counts.withCode})`} />
      </nav>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>★</TableHead>
              <TableHead>Comentario</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Cuándo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(reviews ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Sin reseñas en este filtro.
                </TableCell>
              </TableRow>
            )}
            {(reviews ?? []).map((r) => (
              <TableRow key={r.id} className={r.rating <= 3 ? 'bg-amber-50' : ''}>
                <TableCell className="font-bold">{r.rating}</TableCell>
                <TableCell className="max-w-sm">
                  <div className="line-clamp-2 text-sm">{r.comment ?? '—'}</div>
                  {r.customer_name && (
                    <div className="text-xs text-muted-foreground">{r.customer_name}</div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.customer_contact ?? '—'}
                </TableCell>
                <TableCell>
                  {r.bonus_code ? (
                    <code className="text-xs">{r.bonus_code}</code>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {r.is_public ? (
                    <Badge variant="default">pública</Badge>
                  ) : (
                    <Badge variant="secondary">interna</Badge>
                  )}
                  {r.bonus_sent && (
                    <div className="mt-1 text-[10px] text-emerald-700">📧 enviada</div>
                  )}
                  {r.redeemed_at && (
                    <div className="mt-1 text-[10px] text-emerald-700">✓ redimida</div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString('es-CO')}
                </TableCell>
                <TableCell>
                  {r.bonus_code && <RedeemForm id={r.id} currentlyRedeemed={!!r.redeemed_at} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FilterLink({ current, value, label }: { current: Filter; value: Filter; label: string }) {
  const on = current === value;
  return (
    <Link
      href={`/admin/reviews?filter=${value}`}
      className={`rounded-full px-3 py-1 ${
        on ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
      }`}
    >
      {label}
    </Link>
  );
}

async function fetchCounts(supabase: ReturnType<typeof createClient>) {
  const [all, positive, negative, withCode] = await Promise.all([
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).gte('rating', 4),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).lte('rating', 3),
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .not('bonus_code', 'is', null),
  ]);
  return {
    all: all.count ?? 0,
    positive: positive.count ?? 0,
    negative: negative.count ?? 0,
    withCode: withCode.count ?? 0,
  };
}
