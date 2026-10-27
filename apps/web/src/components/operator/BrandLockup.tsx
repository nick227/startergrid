type Props = {
  href?: string;
};

/** Operator wordmark. Outfit for the name, Inter everywhere else. */
export function BrandLockup({ href = '#/' }: Props) {
  return (
    <a
      href={href}
      aria-label="DealerGrid home"
      className="shrink-0 font-brand text-lg font-medium leading-none tracking-tight text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-500"
    >
      DealerGrid
    </a>
  );
}
