type Props = {
  href?: string;
};

const CELL = 'rounded-[2px]';

export function BrandLockup({ href = '#/' }: Props) {
  return (
    <a
      href={href}
      aria-label="StarterGrid home"
      className="group flex shrink-0 items-center gap-2.5 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy-500"
    >
      <span aria-hidden="true" className="grid h-[18px] w-[18px] grid-cols-2 gap-[3px]">
        <span className={`${CELL} bg-white`} />
        <span className={`${CELL} bg-navy-500`} />
        <span className={`${CELL} bg-white/35 transition-colors group-hover:bg-white/55`} />
        <span className={`${CELL} bg-white/35 transition-colors group-hover:bg-white/55`} />
      </span>
      <span className="text-[15px] font-semibold leading-none tracking-[-0.04em]">
        <span className="text-white">Starter</span>
        <span className="text-navy-500">Grid</span>
      </span>
    </a>
  );
}
