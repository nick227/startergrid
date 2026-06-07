import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'ApartmentGrid — Easy Vacancy Management for Property Managers',
    description:
      'ApartmentGrid connects your property management software to all your online listing sites automatically. See which sites find renters faster and stop updating listings by hand.',
  },
  brand: {
    name: 'ApartmentGrid',
    tagline: 'Simple vacancy automation for property managers',
    accentColor: '#9333ea', // purple-600
    accentColorDark: '#7e22ce', // purple-700
    accentColorLight: '#f3e8ff', // purple-100
    accentColorGlow: 'rgba(147, 51, 234, 0.18)',
  },
  audience: {
    label: 'property managers',
    industry: 'property management',
    assetNoun: 'units',
    channelNoun: 'listings',
  },
  block1_hero: {
    eyebrow: 'Vacancy Automation',
    headline: 'Get your units online fast. We handle the rest.',
    subheadline:
      'ApartmentGrid connects your property management software directly to the sites where renters look for apartments. When a unit becomes available, it is listed automatically. When a lease is signed, it is removed everywhere. No manual changes required.',
    ctaLabel: 'See how it works',
    ctaSecondaryLabel: 'View our pricing',
    trustItems: [
      'Works with your existing management software',
      'No daily management needed',
      'We handle the complete setup',
    ],
  },
  block2_pain: {
    sectionLabel: 'The challenge',
    heading: 'Managing online vacancies shouldn\'t be a full-time job.',
    subheading:
      'Entering floorplans, amenities, and rent prices across multiple websites takes too much time, and making sure your listings are accurate is a constant headache.',
    painPoints: [
      {
        icon: '📝',
        title: 'Typing the same details over and over',
        body: 'Having to manually enter property specs to Apartments.com, Zillow Rentals, and your own website is frustrating and leads to mistakes.',
      },
      {
        icon: '⏳',
        title: 'Leased units are still showing available',
        body: 'When a unit is rented, it often takes days to remove it from third-party sites. This leads to frustrated renters calling about apartments you no longer have.',
      },
      {
        icon: '📊',
        title: 'Paying for sites that don\'t work',
        body: 'You are likely paying for premium placement on listing sites, but without clear data, you don\'t know which ones are actually driving tours and leases.',
      },
      {
        icon: '⚙️',
        title: 'Software that is hard to use',
        body: 'A lot of software requires a training manual to understand. Your leasing agents should be giving tours, not fighting with complex menus.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'How we help',
    heading: 'We keep your listings accurate, automatically.',
    subheading:
      'ApartmentGrid runs quietly in the background. It connects your main property software to the rest of the internet, so you don\'t have to touch it.',
    features: [
      {
        icon: '🔌',
        title: 'Connects to what you already use',
        body: 'We plug directly into your existing property management systems. You don\'t have to change how you work; we just read the data you already have.',
      },
      {
        icon: '🌐',
        title: 'Updates every site instantly',
        body: 'When you add a new unit or change a rent price, we instantly update Apartments.com, Zillow Rentals, Facebook, and your community\'s website.',
      },
      {
        icon: '📈',
        title: 'Compare where your units rent fastest',
        body: 'We show you exactly how long your properties stay on each site before getting a lease. You can finally see which platforms are actually helping you fill vacancies.',
      },
      {
        icon: '🗄️',
        title: 'A clear history of every change',
        body: 'If a price changed or a unit was leased, we keep a simple record of exactly when and where it happened, so you always know what is going on.',
      },
      {
        icon: '🤖',
        title: 'So simple you never have to log in',
        body: 'We built this to be invisible. Once our team sets it up, it works automatically. Your leasing team doesn\'t have to learn another new tool to do their jobs.',
      },
      {
        icon: '👥',
        title: 'We do the hard work for you',
        body: 'Our team has years of experience in digital leasing. We handle the entire technical setup to get your properties online quickly and correctly.',
      },
    ],
  },
  block4_proof: {
    sectionLabel: 'The results',
    heading: 'Trust the data, not the sales pitch.',
    stats: [
      { value: '100', suffix: '%', label: 'automatic updates across your sites' },
      { value: '15', suffix: '+', label: 'different rental sites supported' },
      { value: '0', suffix: '', label: 'hours spent doing manual data entry' },
      { value: '1', suffix: '', label: 'simple dashboard for all your reports' },
    ],
    testimonial: {
      quote:
        'We used to spend hours re-typing floorplan details and uploading photos to five different websites. Now we enter it once in our management software, and it\'s everywhere. It just works.',
      author: 'Regional Property Manager',
      role: 'National Apartment Community',
    },
  },
  block5_cta: {
    heading: 'Ready to simplify your vacancies?',
    subheading:
      'Pricing is straightforward: $299 per month, per property. This covers the connection to your software, automatic updates to all your sites, and complete setup by our experts.',
    ctaLabel: 'Get started today',
    urgencyNote: 'We manage the entire onboarding process for you.',
  },
};
