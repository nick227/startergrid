type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  as?: 'h1' | 'h2';
  className?: string;
};

export function PageHeader({ title, subtitle, eyebrow, as: Tag = 'h1', className = '' }: Props) {
  return (
    <header className={`mb-6 space-y-2 sm:mb-8 ${className}`}>
      {eyebrow && (
        <p className="mp-label text-ink-faint">{eyebrow}</p>
      )}
      <Tag className="text-2xl font-bold tracking-tight text-ink-heading sm:text-3xl">
        {title}
      </Tag>
      {subtitle && (
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
          {subtitle}
        </p>
      )}
    </header>
  );
}
