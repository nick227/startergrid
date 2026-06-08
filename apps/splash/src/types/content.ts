/**
 * SplashContent — the complete data contract for one category landing page.
 * Each of the 5 text blocks maps to a section component.
 * Category-driven: everything in this type.
 * Shared/structural: layout, animations, form fields, footer legal copy.
 */

export interface SplashContentMeta {
  /** <title> tag value */
  title: string;
  /** <meta name="description"> content */
  description: string;
}

export interface SplashContentBrand {
  /** e.g. "DealerGrid" */
  name: string;
  /** Short tagline displayed under nav logo */
  tagline: string;
  /** HSL or hex — applied as --accent CSS custom property */
  accentColor: string;
  /** Darker variant for hover states — --accent-dark */
  accentColorDark: string;
  /** Pale tint for backgrounds — --accent-light */
  accentColorLight: string;
  /** Glow with alpha for box-shadows — --accent-glow */
  accentColorGlow: string;
}

export interface SplashContentAudience {
  /** e.g. "dealers", "boat brokers", "landlords" */
  label: string;
  /** e.g. "automotive", "marine", "real estate" */
  industry: string;
  /** e.g. "vehicles", "boats", "homes" */
  assetNoun: string;
  /** e.g. "listings", "inventory", "units" */
  channelNoun: string;
}

// ─── Block 1 — Hero ──────────────────────────────────────────────────────────
export interface Block1Hero {
  /** Short category eyebrow above headline, e.g. "Built for Dealers" */
  eyebrow: string;
  /** Main headline — can include <em> for accent color via dangerouslySetInnerHTML */
  headline: string;
  /** Supporting sentence under headline */
  subheadline: string;
  /** Primary CTA button label */
  ctaLabel: string;
  /** Secondary CTA label (opens form modal) */
  ctaSecondaryLabel: string;
  /** Trust micro-copy items under hero CTAs */
  trustItems: string[];
}

// ─── Block 2 — Pain ───────────────────────────────────────────────────────────
export interface PainPoint {
  icon: string;   // emoji or short Unicode
  title: string;
  body: string;
}

export interface Block2Pain {
  sectionLabel: string;
  heading: string;
  subheading?: string;
  painPoints: PainPoint[];
}

// ─── Block 3 — Features ───────────────────────────────────────────────────────
export interface Feature {
  icon: string;
  title: string;
  body: string;
}

export interface Block3Features {
  sectionLabel: string;
  heading: string;
  subheading: string;
  features: Feature[];
}

// ─── Block 4 — Proof ─────────────────────────────────────────────────────────
export interface Stat {
  value: string;
  suffix?: string;  // e.g. "+" or "%"
  label: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export interface Block4Proof {
  sectionLabel: string;
  heading: string;
  stats: Stat[];
  testimonial?: Testimonial;
}

// ─── Block 5 — CTA ───────────────────────────────────────────────────────────
export interface Block5Cta {
  heading: string;
  subheading: string;
  ctaLabel: string;
  urgencyNote?: string;
}

export interface SplashContentImages {
  hero?: string;
  pain: string;
  features: string[];
  testimonial?: string;
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export interface SplashContent {
  meta: SplashContentMeta;
  brand: SplashContentBrand;
  audience: SplashContentAudience;
  images?: SplashContentImages;
  block1_hero: Block1Hero;
  block2_pain: Block2Pain;
  block3_features: Block3Features;
  block4_proof: Block4Proof;
  block5_cta: Block5Cta;
}
