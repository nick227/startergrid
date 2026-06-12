type Props = {
  shown: number;
  total: number;
  noun: string;
};

export function ResultCount({ shown, total, noun }: Props) {
  return (
    <p className="text-xs text-ink-faint">
      {shown === total
        ? `${total} ${noun}${total !== 1 ? 's' : ''}`
        : `${shown} of ${total} ${noun}${total !== 1 ? 's' : ''}`}
    </p>
  );
}
