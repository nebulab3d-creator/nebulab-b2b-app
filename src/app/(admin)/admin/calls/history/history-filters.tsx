'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const REASONS = ['pedir', 'cuenta', 'otro'];
const STATUSES = ['pending', 'acknowledged', 'resolved'];

export function HistoryFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const range = params.get('range') ?? 'today';
  const tableFilter = params.get('table') ?? '';
  const reasonFilters = new Set(params.getAll('reason'));
  const statusFilters = new Set(params.getAll('status'));

  const handleTableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newParams = new URLSearchParams(params);
    if (e.target.value) {
      newParams.set('table', e.target.value);
    } else {
      newParams.delete('table');
    }
    router.push(`?${newParams.toString()}`);
  };

  const handleReasonChange = (reason: string, checked: boolean) => {
    const newParams = new URLSearchParams(params);
    newParams.delete('reason');

    if (checked) {
      reasonFilters.add(reason);
    } else {
      reasonFilters.delete(reason);
    }

    for (const r of reasonFilters) {
      newParams.append('reason', r);
    }

    router.push(`?${newParams.toString()}`);
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newParams = new URLSearchParams(params);
    newParams.delete('status');

    if (checked) {
      statusFilters.add(status);
    } else {
      statusFilters.delete(status);
    }

    for (const s of statusFilters) {
      newParams.append('status', s);
    }

    router.push(`?${newParams.toString()}`);
  };

  const handleClear = () => {
    router.push(`?range=${range}`);
  };

  const hasFilters = tableFilter || reasonFilters.size > 0 || statusFilters.size > 0;

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Filtro de mesa */}
        <div>
          <Label htmlFor="table-input" className="mb-2 block text-sm font-medium">
            Número de mesa
          </Label>
          <Input
            id="table-input"
            type="number"
            placeholder="Ej: 7"
            value={tableFilter}
            onChange={handleTableChange}
            min="1"
            className="h-9"
          />
        </div>

        {/* Filtro de razón */}
        <div>
          <div className="mb-2 text-sm font-medium">Razón</div>
          <div className="space-y-2">
            {REASONS.map((reason) => (
              <label key={reason} className="flex items-center gap-2">
                <Checkbox
                  checked={reasonFilters.has(reason)}
                  onCheckedChange={(checked) => handleReasonChange(reason, checked as boolean)}
                />
                <span className="text-sm capitalize">{reason}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Filtro de estado */}
        <div>
          <div className="mb-2 text-sm font-medium">Estado</div>
          <div className="space-y-2">
            {STATUSES.map((status) => (
              <label key={status} className="flex items-center gap-2">
                <Checkbox
                  checked={statusFilters.has(status)}
                  onCheckedChange={(checked) => handleStatusChange(status, checked as boolean)}
                />
                <span className="text-sm capitalize">
                  {status === 'pending'
                    ? 'Pendiente'
                    : status === 'acknowledged'
                      ? 'Atendida'
                      : 'Resuelta'}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {hasFilters && (
        <Button onClick={handleClear} variant="ghost" size="sm" className="h-8 text-xs">
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
