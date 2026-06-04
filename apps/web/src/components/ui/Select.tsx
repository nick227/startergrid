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
      className={`text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500
        ${highlighted && value ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'}
        ${!value ? 'text-slate-400' : ''}
        ${className}`}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
