import { listHref } from '../../lib/routes.ts';

type Props = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
};

export function NotFoundState({
  title,
  description = 'The page you requested is not available or may have been removed.',
  backHref = listHref(),
  backLabel = 'Browse all vehicles',
}: Props) {
  return (
    <div className="mp-card px-5 py-12 text-center sm:px-8 sm:py-16" role="status">
      <p className="text-4xl" aria-hidden="true">404</p>
      <h1 className="mt-3 text-lg font-semibold text-slate-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
      <a href={backHref} className="mp-btn-primary mt-6 inline-flex">
        {backLabel}
      </a>
    </div>
  );
}
