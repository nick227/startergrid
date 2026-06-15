import React from 'react';

type Props = {
  link: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  badge?: string;
};

export function ThumbnailCard({ link, imageUrl, title, subtitle, badge }: Props) {
  return (
    <a href={link} className="group flex flex-col rounded-2xl overflow-hidden text-left">
      <div className="relative h-40 w-full rounded-2xl overflow-hidden shadow-elevation-1 group-hover:shadow-elevation-2 transition mb-3">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
        ) : (
          <div className="absolute inset-0 bg-silver-200" />
        )}
        {badge && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-navy-900 text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">
              {badge}
            </span>
          </div>
        )}
      </div>
      <h4 className="font-bold text-ink-heading mb-1 group-hover:text-orange-600 transition-colors">{title}</h4>
      <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">{subtitle}</p>
    </a>
  );
}
