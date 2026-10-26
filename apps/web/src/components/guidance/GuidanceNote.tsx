type Props = {
  children: React.ReactNode;
};

export function GuidanceNote({ children }: Props) {
  return (
    <p className="text-xs text-ink-muted leading-relaxed">
      {children}
    </p>
  );
}
