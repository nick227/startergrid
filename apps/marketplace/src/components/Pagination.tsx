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
      className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between"
      aria-label="Results pagination"
    >
      <p className="text-sm text-slate-500">
        Showing {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-[7rem] text-center text-sm text-slate-600">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
