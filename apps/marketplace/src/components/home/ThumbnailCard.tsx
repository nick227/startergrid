type Props = {
  link: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  badge?: string;
  fit?: 'cover' | 'contain';
};

export function ThumbnailCard({ link, imageUrl, title, subtitle, badge, fit = 'cover' }: Props) {
  const studio = fit === 'contain';
  return (
    <a href={link} className="group flex flex-col overflow-hidden rounded-xl border border-silver-200 bg-white text-left transition hover:shadow-elevation-2">
      <div className={`relative h-40 w-full overflow-hidden ${studio ? 'bg-[#e8eef3]' : 'bg-silver-200'}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className={studio
              ? 'h-full w-full object-contain p-3'
              : 'absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105'}
          />
        ) : null}
        {badge && (
          <div className="absolute left-3 top-3 z-10">
            <span className="mp-thumb-badge bg-navy-800">
              {badge}
            </span>
          </div>
        )}
      </div>
      <div className="px-3.5 py-3">
        <h4 className="mb-0.5 font-semibold text-ink-heading group-hover:text-cta">{title}</h4>
        <p className="line-clamp-2 text-sm text-ink-muted">{subtitle}</p>
      </div>
    </a>
  );
}
