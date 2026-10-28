type Props = {
  label: string;
  selected: boolean;
  onClick: () => void;
};

export function FilterChip({ label, selected, onClick }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        selected
          ? 'border-navy-800 bg-navy-900 text-white'
          : 'border-silver-300 bg-white text-ink-body hover:bg-silver-100'
      }`}
    >
      {label}
    </button>
  );
}
