import { useEffect, useRef } from 'react';
import type { ListFilters } from '../../lib/api.ts';
import { SectionCard } from './SectionCard.tsx';

type Props = {
  make: string;
  model: string;
  condition: ListFilters['condition'];
  minPrice: string;
  maxPrice: string;
  maxMileage: string;
  onMakeChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onConditionChange: (value: ListFilters['condition']) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onMaxMileageChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  focusToken?: number;
};

export function FilterBar({
  make,
  model,
  condition,
  minPrice,
  maxPrice,
  maxMileage,
  onMakeChange,
  onModelChange,
  onConditionChange,
  onMinPriceChange,
  onMaxPriceChange,
  onMaxMileageChange,
  onSubmit,
  onClear,
  hasActiveFilters,
  focusToken = 0,
}: Props) {
  const makeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusToken > 0) makeRef.current?.focus();
  }, [focusToken]);

  return (
    <SectionCard padded={false} className="p-4 sm:p-5">
      <form
        onSubmit={e => { e.preventDefault(); onSubmit(); }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_12rem_9rem_9rem_10rem_auto]"
        aria-label="Search vehicles"
      >
        <label className="flex flex-col gap-1.5">
          <span className="mp-label">Make</span>
          <input
            ref={makeRef}
            type="search"
            value={make}
            onChange={e => onMakeChange(e.target.value)}
            placeholder="Any make"
            className="mp-input"
            autoComplete="off"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="mp-label">Model</span>
          <input
            type="search"
            value={model}
            onChange={e => onModelChange(e.target.value)}
            placeholder="Any model"
            className="mp-input"
            autoComplete="off"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="mp-label">Condition</span>
          <select
            value={condition ?? ''}
            onChange={e => onConditionChange((e.target.value as ListFilters['condition']) || undefined)}
            className="mp-input"
          >
            <option value="">Any condition</option>
            <option value="NEW">New</option>
            <option value="USED">Used</option>
            <option value="CPO">Certified pre-owned</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="mp-label">Min price</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={minPrice}
            onChange={e => onMinPriceChange(e.target.value)}
            placeholder="$"
            className="mp-input"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="mp-label">Max price</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={maxPrice}
            onChange={e => onMaxPriceChange(e.target.value)}
            placeholder="$"
            className="mp-input"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="mp-label">Max miles</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={maxMileage}
            onChange={e => onMaxMileageChange(e.target.value)}
            placeholder="Any"
            className="mp-input"
          />
        </label>

        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end lg:col-span-1">
          <button type="submit" className="mp-btn-primary w-full sm:w-auto">
            Search
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={onClear} className="mp-btn-ghost w-full sm:w-auto">
              Clear filters
            </button>
          )}
        </div>
      </form>
    </SectionCard>
  );
}
