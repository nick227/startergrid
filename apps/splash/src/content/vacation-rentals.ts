import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'StayGrid — Easy Listing Management for Vacation Rentals',
    description:
      'StayGrid connects your property management software to all your online listing sites automatically. See which sites find guests faster and stop updating calendars by hand.',
  },
  brand: {
    name: 'StayGrid',
    tagline: 'Simple listing automation for vacation rentals',
    accentColor: '#0ea5e9', // sky-500
    accentColorDark: '#0284c7', // sky-600
    accentColorLight: '#e0f2fe', // sky-100
    accentColorGlow: 'rgba(14, 165, 233, 0.18)',
  },
  audience: {
    label: 'hosts',
    industry: 'vacation rental',
    assetNoun: 'properties',
    channelNoun: 'listings',
  },
  block1_hero: {
    eyebrow: 'Listing Automation',
    headline: 'Get your properties online fast. We handle the rest.',
    subheadline:
      'StayGrid connects your property software directly to the sites where guests look for vacation rentals. When a property is listed, it goes live automatically. When dates are booked, your calendar is updated everywhere. No manual changes required.',
    ctaLabel: 'See how it works',
    ctaSecondaryLabel: 'View our pricing',
    trustItems: [
      'Works with your existing PMS',
      'No daily management needed',
      'We handle the complete setup',
    ],
  },
  block2_pain: {
    sectionLabel: 'The challenge',
    heading: 'Managing online listings shouldn\'t be a full-time job.',
    subheading:
      'Entering house rules, amenities, and photos across multiple websites takes too much time, and keeping your availability calendar accurate is a constant headache.',
    painPoints: [
      {
        icon: '📝',
        title: 'Typing the same details over and over',
        body: 'Having to manually enter property specs to Airbnb, VRBO, Booking.com, and your own website is frustrating and leads to mistakes.',
      },
      {
        icon: '⏳',
        title: 'Booked dates are still showing available',
        body: 'When a guest books a stay, it often takes time to update on third-party sites. This leads to double-bookings and frustrated guests.',
      },
      {
        icon: '📊',
        title: 'Paying for sites that don\'t work',
        body: 'You are likely paying for premium placement on listing sites, but without clear data, you don\'t know which ones are actually driving bookings.',
      },
      {
        icon: '⚙️',
        title: 'Software that is hard to use',
        body: 'A lot of software requires a training manual to understand. Your team should be managing properties, not fighting with complex menus.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'How we help',
    heading: 'We keep your listings accurate, automatically.',
    subheading:
      'StayGrid runs quietly in the background. It connects your main property software to the rest of the internet, so you don\'t have to touch it.',
    features: [
      {
        icon: '🔌',
        title: 'Connects to what you already use',
        body: 'We plug directly into your existing property management systems. You don\'t have to change how you work; we just read the data you already have.',
      },
      {
        icon: '🌐',
        title: 'Updates every site instantly',
        body: 'When you add a new property or change a nightly rate, we instantly update Airbnb, VRBO, Booking.com, and your direct booking website.',
      },
      {
        icon: '📈',
        title: 'Compare where your properties book fastest',
        body: 'We show you exactly how long your dates stay open on each site before getting booked. You can finally see which platforms are actually helping you fill your calendar.',
      },
      {
        icon: '🗄️',
        title: 'A clear history of every change',
        body: 'If a rate dropped or a calendar was blocked, we keep a simple record of exactly when and where it happened, so you always know what is going on.',
      },
      {
        icon: '🤖',
        title: 'So simple you never have to log in',
        body: 'We built this to be invisible. Once our team sets it up, it works automatically. Your team doesn\'t have to learn another new tool to do their jobs.',
      },
      {
        icon: '👥',
        title: 'We do the hard work for you',
        body: 'Our team has years of experience in digital hospitality. We handle the entire technical setup to get your properties online quickly and correctly.',
      },
    ],
  },
  block4_proof: {
    sectionLabel: 'The results',
    heading: 'Trust the data, not the sales pitch.',
    stats: [
      { value: '100', suffix: '%', label: 'automatic updates across your sites' },
      { value: '10', suffix: '+', label: 'different travel sites supported' },
      { value: '0', suffix: '', label: 'hours spent doing manual data entry' },
      { value: '1', suffix: '', label: 'simple dashboard for all your reports' },
    ],
    testimonial: {
      quote:
        'We used to spend hours re-typing house rules and manually syncing calendars to prevent double bookings. Now we enter it once in our PMS, and it\'s everywhere. It just works.',
      author: 'Operations Director',
      role: 'Vacation Rental Management Co.',
    },
  },
  block5_cta: {
    heading: 'Ready to simplify your listings?',
    subheading:
      'Pricing is straightforward: $29 per month, per property. This covers the connection to your software, automatic updates to all your sites, and complete setup by our experts.',
    ctaLabel: 'Get started today',
    urgencyNote: 'We manage the entire onboarding process for you.',
  },
};
