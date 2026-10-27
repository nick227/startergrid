type Props = {
  href?: string;
};

/** Wordmark with the accent dot used on the operator bar. */
export function BrandLockup({ href = '#/' }: Props) {
  return (
    <a
      href={href}
      aria-label="StarterGrid home"
      className="shrink-0 rounded-sm text-[17px] font-bold leading-none tracking-tight text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-500"
    >
      StarterGrid
      <span aria-hidden="true" className="ml-0.5 inline-block h-1.5 w-1.5 -translate-y-2 rounded-full bg-orange-500" />
    </a>
  );
}
