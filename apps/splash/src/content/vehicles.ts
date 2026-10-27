import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'StarterGrid — Automotive Channel Intelligence & Distribution',
    description:
      'StarterGrid ingests inventory from your DMS, validates data across 31 destination schemas, syndicates to search, social and portals, and measures deterministic sales attribution.',
  },
  brand: {
    name: 'StarterGrid',
    tagline: 'Automotive Distribution & Closed-Loop Attribution Platform',
    accentColor: '#2563eb',
    accentColorDark: '#1d4ed8',
    accentColorLight: '#eff6ff',
    accentColorGlow: 'rgba(37, 99, 235, 0.22)',
  },
  audience: {
    label: 'dealers',
    industry: 'automotive',
    assetNoun: 'vehicles',
    channelNoun: 'destinations',
  },
  block1_hero: {
    eyebrow: 'Automotive Distribution Engine',
    headline: 'Multi-channel vehicle distribution with audited sales attribution.',
    subheadline:
      'StarterGrid ingests lot inventory from your DMS, executes 17-point pre-flight validation against destination-specific rules, syndicates across 31 platforms, and attributes closed sales back to originating channels.',
    ctaLabel: 'Onboard Dealership',
    ctaSecondaryLabel: 'View Performance Matrix',
    trustItems: [
      'Coexists with CDK, Reynolds, Dealertrack & Frazer',
      '17-Point Pre-Flight Schema Verification',
      'First-Party Consumer Marketplace Included',
    ],
  },
  block2_pain: {
    sectionLabel: 'The Operational Gap',
    heading: 'Dealerships pay for syndication, but lose visibility into true acquisition costs.',
    subheading:
      'Traditional syndication exports dirty data that fails silently on third-party sites, while ad vendors claim duplicate credit for in-store sales.',
    painPoints: [
      {
        icon: '⚠️',
        title: 'Silent Feed Rejections',
        body: 'Missing EPA mileage, improper photo crops, or missing trim codes cause platforms to drop listings without notifying dealership staff.',
      },
      {
        icon: '⏳',
        title: 'Syndication Lag and Stale Stock',
        body: 'Overnight batch exports leave sold vehicles advertised for days, wasting ad budget and frustrating prospective buyers.',
      },
      {
        icon: '📊',
        title: 'Unverifiable Ad Vendor Claims',
        body: 'Third-party marketplaces self-report inflated lead numbers, while dealerships lack deterministic sale-to-lead attribution.',
      },
      {
        icon: '💸',
        title: 'Fragmented Vendor Tax',
        body: 'Paying separate vendors for inventory software, feed distribution, and analytics costs $3,500+ per month per rooftop.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'The Platform Solution',
    heading: 'Engineered for inventory readiness, multi-channel syndication, and audited ROI.',
    subheading:
      'A reactive software operating system that connects your DMS to search engines, social catalogs, third-party portals, and our first-party marketplace.',
    features: [
      {
        icon: '🔌',
        title: 'Non-Disruptive DMS Ingestion',
        body: 'Ingests inventory outputs from CDK, Reynolds & Reynolds, Dealertrack, Frazer, and DealerCenter. Your DMS remains the system of record for accounting and floorplanning.',
      },
      {
        icon: '🛡️',
        title: '17-Point Pre-Flight Sentry',
        body: 'Inspects VIN check digits, mandatory 6-slot media grids, odometer readings, and destination rules before pushing feeds to prevent silent rejections.',
      },
      {
        icon: '🌐',
        title: 'First-Party Consumer Marketplace',
        body: 'Active vehicles index instantly with zero syndication lag, zero competitor conquest ads on VDPs, and direct-to-CRM ADF/XML lead routing.',
      },
      {
        icon: '📈',
        title: 'Deterministic Sales Attribution',
        body: 'Links sold vehicles back to originating channel leads when marked sold in your DMS, reporting verified Cost Per Lead (CPL) and Cost Per Sale (CPS).',
      },
      {
        icon: '🏷️',
        title: '4-Tier Evidence Standard',
        body: 'Every metric is explicitly tagged as [Observed], [Reported], [Attributed], or [Estimated] so dealers always know the certainty of their numbers.',
      },
      {
        icon: '⏱️',
        title: 'Turn Velocity Intelligence',
        body: 'Tracks inventory age across 0-15d, 16-30d, 31-60d, and 60d+ brackets with statistically gated (N ≥ 5) turn recommendations.',
      },
    ],
  },
  block4_proof: {
    sectionLabel: 'Audited Telemetry',
    heading: 'Measured Performance Benchmarks',
    stats: [
      { value: '31', suffix: '', label: 'supported syndication destinations' },
      { value: '17', suffix: '-pt', label: 'automated pre-flight validation rules' },
      { value: '0', suffix: 'min', label: 'marketplace sync latency' },
      { value: '100', suffix: '%', label: 'ADF/XML lead delivery verification' },
    ],
    testimonial: {
      quote:
        'StarterGrid eliminated our silent syndication errors and proved our true acquisition costs across Meta, Google, and third-party portals with deterministic sales attribution.',
      author: 'Austin Auto Group',
      role: 'Operations & Inventory Management',
    },
  },
  block5_cta: {
    heading: 'Connect Your Dealership to the StarterGrid Platform',
    subheading:
      'Transparent pricing: $499 per month per rooftop. Unlimited vehicle inventory, 31 syndication channels, first-party marketplace inclusion, and full ADF/XML CRM dispatch.',
    ctaLabel: 'Onboard Rooftop ($499/mo)',
    urgencyNote: 'Includes assisted DMS feed configuration and full operator portal access.',
  },
};
