import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'HomeGrid — Easy Listing Management for Real Estate Brokerages',
    description:
      'HomeGrid connects your brokerage software to all your online listing sites automatically. See which sites find buyers faster and stop updating listings by hand.',
  },
  brand: {
    name: 'HomeGrid',
    tagline: 'Simple listing automation for real estate brokerages',
    accentColor: '#059669', // emerald-600
    accentColorDark: '#047857', // emerald-700
    accentColorLight: '#d1fae5', // emerald-100
    accentColorGlow: 'rgba(5, 150, 105, 0.18)',
  },
  audience: {
    label: 'brokerages',
    industry: 'real estate',
    assetNoun: 'homes',
    channelNoun: 'listings',
  },
  block1_hero: {
    eyebrow: 'Listing Automation',
    headline: 'Get your properties online fast. We handle the rest.',
    subheadline:
      'HomeGrid connects your brokerage software directly to the sites where buyers look for homes. When a property is listed, it goes live automatically. When it goes under contract, it is updated everywhere. No manual changes required.',
    ctaLabel: 'See how it works',
    ctaSecondaryLabel: 'View our pricing',
    trustItems: [
      'Works with your existing MLS software',
      'No daily management needed',
      'We handle the complete setup',
    ],
  },
  block2_pain: {
    sectionLabel: 'The challenge',
    heading: 'Managing online listings shouldn\'t be a full-time job.',
    subheading:
      'Entering property details, room dimensions, and photos across multiple websites takes too much time, and keeping open house dates accurate is a constant headache.',
    painPoints: [
      {
        icon: '📝',
        title: 'Typing the same details over and over',
        body: 'Having to manually enter property specs to Zillow, Realtor.com, Trulia, and your own website is frustrating and leads to mistakes.',
      },
      {
        icon: '⏳',
        title: 'Pending homes are still showing active',
        body: 'When a home goes under contract, it often takes days to update on third-party sites. This leads to frustrated buyers calling about properties that are already gone.',
      },
      {
        icon: '📊',
        title: 'Paying for sites that don\'t work',
        body: 'You are likely paying for premium placement on listing sites, but without clear data, you don\'t know which ones are actually driving tours and offers.',
      },
      {
        icon: '⚙️',
        title: 'Software that is hard to use',
        body: 'A lot of software requires a training manual to understand. Your agents should be showing houses, not fighting with complex menus.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'How we help',
    heading: 'We keep your listings accurate, automatically.',
    subheading:
      'HomeGrid runs quietly in the background. It connects your main brokerage software to the rest of the internet, so you don\'t have to touch it.',
    features: [
      {
        icon: '🔌',
        title: 'Connects to what you already use',
        body: 'We plug directly into your existing MLS and brokerage management systems. You don\'t have to change how you work; we just read the data you already have.',
      },
      {
        icon: '🌐',
        title: 'Updates every site instantly',
        body: 'When you add a new home or change a price, we instantly update Zillow, Realtor.com, Redfin, Facebook, and your brokerage\'s website.',
      },
      {
        icon: '📈',
        title: 'Compare where your homes sell fastest',
        body: 'We show you exactly how long your properties stay on each site before getting an offer. You can finally see which platforms are actually helping you move inventory.',
      },
      {
        icon: '🗄️',
        title: 'A clear history of every change',
        body: 'If a price dropped or a listing changed status, we keep a simple record of exactly when and where it happened, so you always know what is going on.',
      },
      {
        icon: '🤖',
        title: 'So simple you never have to log in',
        body: 'We built this to be invisible. Once our team sets it up, it works automatically. Your agents don\'t have to learn another new tool to do their jobs.',
      },
      {
        icon: '👥',
        title: 'We do the hard work for you',
        body: 'Our team has years of experience in digital real estate. We handle the entire technical setup to get your brokerage online quickly and correctly.',
      },
    ],
  },
  block4_proof: {
    sectionLabel: 'The results',
    heading: 'Trust the data, not the sales pitch.',
    stats: [
      { value: '100', suffix: '%', label: 'automatic updates across your sites' },
      { value: '25', suffix: '+', label: 'different sales sites supported' },
      { value: '0', suffix: '', label: 'hours spent doing manual data entry' },
      { value: '1', suffix: '', label: 'simple dashboard for all your reports' },
    ],
    testimonial: {
      quote:
        'We used to spend hours re-typing property descriptions and uploading photos to five different websites. Now we enter it once in our MLS, and it\'s everywhere. It just works.',
      author: 'Managing Broker',
      role: 'Regional Real Estate Firm',
    },
  },
  block5_cta: {
    heading: 'Ready to simplify your listings?',
    subheading:
      'Pricing is straightforward: $399 per month, per office. This covers the connection to your software, automatic updates to all your sites, and complete setup by our experts.',
    ctaLabel: 'Get started today',
    urgencyNote: 'We manage the entire onboarding process for you.',
  },
};
