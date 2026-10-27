type Props = {
  href?: string;
};

export function BrandLockup({ href = '#/' }: Props) {
  return (
    <a
      href={href}
      aria-label="StarterGrid home"
      className="shrink-0 rounded-sm leading-none tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy-500"
    >
      <span className="text-lg font-extrabold text-white">Starter</span>
      <span className="text-lg font-extrabold text-navy-500">Grid</span>
    </a>
  );
}
