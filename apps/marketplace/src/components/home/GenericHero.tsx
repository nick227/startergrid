import { useCategorySchema, useCategorySlug } from '../../contexts/CategoryContext.tsx';
import { listHref } from '../../lib/routes.ts';

export function GenericHero() {
  const schema = useCategorySchema();
  const slug = useCategorySlug();
  const isBoats = schema.id === 'BOATS';
  const isBooks = schema.id === 'EBOOKS';

  const eyebrow = isBoats
    ? 'VERIFIED WATERCRAFT • DIRECT MARINE NETWORK'
    : isBooks
    ? 'INDEPENDENT PUBLISHERS • DIGITAL MONOGRAPHS'
    : `${schema.label.toUpperCase()} • DIRECT SELLER NETWORK`;

  const title = isBoats
    ? 'Find Boats & Marine Craft.'
    : isBooks
    ? 'Digital Titles & Field Guides.'
    : `Browse ${schema.label}.`;

  const subtitle = isBoats
    ? 'Discover center consoles, express cruisers, and marine vessels directly from certified marine dealers and yacht brokers. Verified Hull Identification Numbers (HIN) and documented engine hours.'
    : isBooks
    ? 'Explore technical manuals, software guides, and original monographs from independent publishers. Cataloged with ISBNs and instant online access.'
    : schema.marketplace.tagline || `Discover ${schema.asset.plural} directly from participating sellers with verified ${schema.asset.idLabel || 'identifiers'}.`;

  const badges = isBoats
    ? ['HIN Verified', 'Engine Hours Documented', 'Direct Marine Desks']
    : isBooks
    ? ['Standard ISBNs', 'Instant Online Delivery', 'Direct Publisher Inquiries']
    : [`${schema.asset.idLabel || 'Identifier'} Verified`, 'Direct Seller Lot', 'Transparent Pricing'];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cta/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-emerald-400 border border-white/10 backdrop-blur-sm mb-5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{eyebrow}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
          {title}
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed mb-8">
          {subtitle}
        </p>

        {/* Category Trust Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
          {badges.map((badge, idx) => (
            <span
              key={idx}
              className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm"
            >
              ✓ {badge}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={listHref(slug)}
            className="mp-btn-primary py-3 px-8 text-sm font-bold shadow-lg shadow-cta/20 hover:shadow-cta/30 transition flex items-center gap-2"
          >
            <span>Browse All {schema.asset.plural}</span>
            <span>→</span>
          </a>
          {isBoats && (
            <a
              href={listHref(slug, { q: 'center console' })}
              className="mp-btn-secondary py-3 px-6 text-sm font-semibold bg-white/10 text-white border-white/20 hover:bg-white/20 transition"
            >
              Center Consoles
            </a>
          )}
          <a
            href="#/"
            className="mp-btn-ghost py-3 px-5 text-sm font-medium text-slate-400 hover:text-white transition"
          >
            ← All Marketplaces
          </a>
        </div>
      </div>
    </section>
  );
}
