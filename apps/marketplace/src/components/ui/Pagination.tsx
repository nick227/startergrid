type Props = {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageSize, total, hasNext, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (totalPages <= 1) return null;

  return (
    <nav
      className="mt-8 flex flex-col items-stretch gap-4 sm:mt-10 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Results pagination"
    >
      <p className="text-center text-sm text-slate-500 sm:text-left">
        Showing {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      </p>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          aria-disabled={!hasPrev}
          className="mp-btn-secondary min-w-[6.5rem]"
        >
          Previous
        </button>
        <span className="min-w-[7rem] text-center text-sm text-slate-600" aria-live="polite">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          aria-disabled={!hasNext}
          className="mp-btn-secondary min-w-[6.5rem]"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
