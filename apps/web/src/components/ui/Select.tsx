type Option = { value: string; label: string };

type Props = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  highlighted?: boolean;
  className?: string;
};

export function Select({ value, options, onChange, highlighted = false, className = '' }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-navy-500/30
        ${highlighted && value ? 'border-status-success-border bg-status-success-bg' : 'border-silver-200 bg-white'}
        ${!value ? 'text-ink-faint' : ''}
        ${className}`}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
