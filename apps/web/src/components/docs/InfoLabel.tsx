import { InfoButton } from './InfoButton.tsx';

type Props = {
  term: string;
  docId: string;
  className?: string;
  termClassName?: string;
  inverted?: boolean;
};

export function InfoLabel({ term, docId, className = '', termClassName = '', inverted = false }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={termClassName}>{term}</span>
      <InfoButton
        docId={docId}
        className={inverted ? 'border-white/40 bg-white/15 text-white/90 hover:bg-white/25 hover:text-white hover:border-white/60' : ''}
      />
    </span>
  );
}
