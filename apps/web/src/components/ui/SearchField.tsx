type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

export function SearchField({ value, onChange, placeholder, className, autoFocus }: Props) {
  return (
    <div className={`relative min-w-0 ${className ?? 'w-full'}`}>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="field-input w-full pr-16 [&::-webkit-search-cancel-button]:hidden"
      />
      {value.trim() !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-ink-muted hover:text-ink-heading"
        >
          Clear
        </button>
      )}
    </div>
  );
}
