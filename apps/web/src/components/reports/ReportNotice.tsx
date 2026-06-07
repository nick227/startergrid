type Props = {
  children: React.ReactNode;
};

/** Muted footnote for observed-activity / non-attribution disclaimers. */
export function ReportNotice({ children }: Props) {
  return (
    <p className="text-xs text-ink-faint leading-relaxed border-l-2 border-silver-300 pl-3 py-0.5">
      {children}
    </p>
  );
}
