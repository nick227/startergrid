import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'StarterGrid — One Platform for Online Automotive Sales',
    description:
      'Manage your vehicles, connect online sales channels, publish inventory, receive buyer inquiries, and measure results.',
  },
  brand: {
    name: 'StarterGrid',
    tagline: 'Dealership Software & Online Automotive Sales',
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
    eyebrow: 'StarterGrid / Dealership Software',
    headline: 'One platform for online automotive sales.',
    subheadline:
      'Manage your vehicles, connect online sales channels, publish inventory, receive inquiries, and measure results.',
    ctaLabel: 'Contact Us',
    ctaSecondaryLabel: 'Explore Live Demo',
    trustItems: [
      'Works alongside your existing DMS (CDK, Reynolds, Dealertrack)',
      'Publish vehicles to search, social, and classified sites',
      'Includes consumer marketplace with zero competitor ads',
    ],
  },
  block2_pain: {
    sectionLabel: 'Common Dealership Challenges',
    heading: 'Publishing inventory online shouldn’t create messy data or guesswork.',
    subheading:
      'Dealerships often struggle with dropped listings, sold vehicles staying online, and unclear advertising results.',
    painPoints: [
      {
        icon: '⚠️',
        title: 'Listings Dropped Without Notice',
        body: 'Missing details, improper photo formats, or missing trim codes cause platforms to quietly reject vehicles, leaving cars unlisted.',
      },
      {
        icon: '⏳',
        title: 'Sold Cars Still Advertised',
        body: 'Slow batch updates leave sold vehicles online for days, wasting advertising budget and frustrating prospective shoppers.',
      },
      {
        icon: '📊',
        title: 'Unclear Marketing Results',
        body: 'Listing sites report clicks and impressions, but dealerships struggle to see which advertising channels actually bring in paying customers.',
      },
      {
        icon: '💸',
        title: 'Too Many Disconnected Tools',
        body: 'Paying separate vendors for inventory software, listing feeds, and reporting leads to high monthly costs and fragmented records.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'What StarterGrid Does',
    heading: 'Everything your dealership needs to sell vehicles online.',
    subheading:
      'Connect your lot inventory to search ads, social media catalogs, auto marketplaces, and direct CRM inquiry delivery.',
    features: [
      {
        icon: '🔌',
        title: 'Works With Your DMS',
        body: 'Import vehicle inventory from CDK, Reynolds & Reynolds, Dealertrack, Frazer, or standard CSV files. Your DMS remains the authority for accounting and deals.',
      },
      {
        icon: '🛡️',
        title: 'Listing Quality Checks',
        body: 'Checks VINs, photos, prices, and vehicle specs before publishing so listings meet platform rules and avoid silent rejections.',
      },
      {
        icon: '🌐',
        title: 'StarterGrid Auto Marketplace',
        body: 'Publish vehicles to our public consumer marketplace. Interested shoppers see only your vehicle and dealership contact info, with no competitor conquest ads.',
      },
      {
        icon: '📈',
        title: 'Sales Tracking by Channel',
        body: 'Connect closed vehicle sales back to the advertising channel that generated the buyer inquiry, based on verified dealership records.',
      },
      {
        icon: '🏷️',
        title: 'Clear Evidence Badges',
        body: 'Every performance figure clearly shows where the data came from: direct platform measurement, dealer-reported costs, or verified sales.',
      },
      {
        icon: '⏱️',
        title: 'Inventory Age & Turn Guidance',
        body: 'Track days on lot across practical age brackets to help your team price vehicles competitively and move older inventory.',
      },
    ],
  },
  block4_proof: {
    sectionLabel: 'Operational Overview',
    heading: 'Built for Real Dealership Operations',
    stats: [
      { value: '31', suffix: '', label: 'supported advertising and marketplace channels' },
      { value: '4', suffix: '', label: 'core categories: Marketplaces, Ads, Feeds, Leads' },
      { value: 'ADF', suffix: '/XML', label: 'direct email delivery into your dealership CRM' },
      { value: '100', suffix: '%', label: 'listing protection: no conquest ads on your vehicle pages' },
    ],
    testimonial: {
      quote:
        'StarterGrid keeps our lot inventory organized, publishes our vehicles to every channel we use, and routes buyer inquiries straight to our CRM.',
      author: 'Austin Auto Group',
      role: 'Inventory & Sales Operations',
    },
  },
  block5_cta: {
    heading: 'Get Started with StarterGrid',
    subheading:
      'Have questions about DMS feeds, multi-rooftop accounts, or marketplace listings? Contact our team, or sign up today in minutes with an email and credit card.',
    ctaLabel: 'Contact Us',
    urgencyNote: 'Our team will review your lot requirements and follow up within one business day.',
  },
};
