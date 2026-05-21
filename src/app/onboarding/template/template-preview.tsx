'use client';

import { type MenuTemplate, MENU_TEMPLATE_LABELS } from '@/lib/validations/menu';

type PreviewItem = {
  name: string;
  description: string;
  price: string;
};

const SAMPLE_ITEMS: PreviewItem[] = [
  { name: 'Ensalada César', description: 'lechuga, pollo, queso', price: '$12.50' },
  { name: 'Pasta Carbonara', description: 'huevo, jamón, queso', price: '$14.90' },
  { name: 'Pollo a la Plancha', description: 'papa, verduras, salsa', price: '$16.50' },
];

function PreviewCardDefault({ item }: { item: PreviewItem }) {
  return (
    <div className="flex gap-2 rounded border bg-white p-2">
      <div className="h-16 w-16 flex-shrink-0 rounded bg-gradient-to-br from-orange-200 to-orange-300" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-gray-900">{item.name}</div>
        <div className="line-clamp-1 text-xs text-gray-600">{item.description}</div>
        <div className="mt-1 text-xs font-bold text-orange-600">{item.price}</div>
      </div>
    </div>
  );
}

function PreviewCardCompact({ item }: { item: PreviewItem }) {
  return (
    <div className="border-b border-gray-200 py-1">
      <div className="text-xs font-semibold text-gray-900">{item.name}</div>
      <div className="line-clamp-1 text-xs text-gray-500">{item.description}</div>
      <div className="flex items-center justify-between pt-0.5">
        <span />
        <span className="text-xs font-bold text-orange-600">{item.price}</span>
      </div>
    </div>
  );
}

function PreviewCardGrid({ item }: { item: PreviewItem }) {
  return (
    <div className="overflow-hidden rounded border bg-white">
      <div className="h-12 w-full bg-gradient-to-br from-orange-200 to-orange-300" />
      <div className="p-1.5">
        <div className="text-xs font-semibold text-gray-900">{item.name}</div>
        <div className="line-clamp-1 text-xs text-gray-600">{item.description}</div>
        <div className="mt-1 text-xs font-bold text-orange-600">{item.price}</div>
      </div>
    </div>
  );
}

type PreviewProps = {
  selected?: MenuTemplate;
  onSelect?: (template: MenuTemplate) => void;
};

export function TemplatePreview({ selected, onSelect }: PreviewProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Default */}
        <button
          type="button"
          onClick={() => onSelect?.('default')}
          className={`overflow-hidden rounded-lg border-2 p-3 text-left transition-all ${
            selected === 'default'
              ? 'border-orange-500 bg-orange-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }`}
        >
          <div className="mb-2 text-xs font-bold text-gray-900">{MENU_TEMPLATE_LABELS.default}</div>
          <div className="space-y-2">
            {SAMPLE_ITEMS.slice(0, 2).map((item, i) => (
              <PreviewCardDefault key={i} item={item} />
            ))}
          </div>
          <div className="mt-2 text-center text-xs text-gray-500">
            + {SAMPLE_ITEMS.length - 2} más
          </div>
        </button>

        {/* Compact */}
        <button
          type="button"
          onClick={() => onSelect?.('compact')}
          className={`overflow-hidden rounded-lg border-2 p-3 text-left transition-all ${
            selected === 'compact'
              ? 'border-orange-500 bg-orange-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }`}
        >
          <div className="mb-2 text-xs font-bold text-gray-900">{MENU_TEMPLATE_LABELS.compact}</div>
          <div className="space-y-0 text-xs">
            {SAMPLE_ITEMS.slice(0, 3).map((item, i) => (
              <PreviewCardCompact key={i} item={item} />
            ))}
          </div>
        </button>

        {/* Grid */}
        <button
          type="button"
          onClick={() => onSelect?.('grid')}
          className={`overflow-hidden rounded-lg border-2 p-3 text-left transition-all ${
            selected === 'grid'
              ? 'border-orange-500 bg-orange-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }`}
        >
          <div className="mb-2 text-xs font-bold text-gray-900">{MENU_TEMPLATE_LABELS.grid}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {SAMPLE_ITEMS.slice(0, 3).map((item, i) => (
              <PreviewCardGrid key={i} item={item} />
            ))}
          </div>
        </button>
      </div>
    </div>
  );
}
