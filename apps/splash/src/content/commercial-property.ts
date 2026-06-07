import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'PropertyGrid — Easy Listing Management for Commercial Real Estate',
    description:
      'PropertyGrid connects your brokerage software to all your online listing sites automatically. See which sites find buyers faster and stop updating listings by hand.',
  },
  brand: {
    name: 'PropertyGrid',
    tagline: 'Simple listing automation for commercial real estate',
    accentColor: '#4f46e5', // indigo-600
    accentColorDark: '#3730a3', // indigo-800
    accentColorLight: '#e0e7ff', // indigo-100
    accentColorGlow: 'rgba(79, 70, 229, 0.18)',
  },
  audience: {
    label: 'brokers',
    industry: 'commercial real estate',
    assetNoun: 'properties',
    channelNoun: 'listings',
  },
  block1_hero: {
    eyebrow: 'Listing Automation',
    headline: 'Get your properties online fast. We handle the rest.',
    subheadline:
      'PropertyGrid connects your brokerage software directly to the sites where investors and tenants look for commercial properties. When a property is listed, it goes live automatically. When it\'s leased or sold, it is updated everywhere. No manual changes required.',
    ctaLabel: 'See how it works',
    ctaSecondaryLabel: 'View our pricing',
    trustItems: [
      'Works with your existing CRM',
      'No daily management needed',
      'We handle the complete setup',
    ],
  },
  block2_pain: {
    sectionLabel: 'The challenge',
    heading: 'Managing online listings shouldn\'t be a full-time job.',
    subheading:
      'Entering square footage, zoning details, and offering memorandums across multiple websites takes too much time, and keeping property availability accurate is a constant headache.',
    painPoints: [
      {
        icon: '📝',
        title: 'Typing the same details over and over',
        body: 'Having to manually enter complex property specs to LoopNet, Crexi, CoStar, and your own website is frustrating and leads to mistakes.',
      },
      {
        icon: '⏳',
        title: 'Leased spaces are still showing available',
        body: 'When a suite is leased, it often takes days to update on third-party sites. This leads to frustrated brokers calling about spaces that are already gone.',
      },
      {
        icon: '📊',
        title: 'Paying for sites that don\'t work',
        body: 'You are likely paying for premium placement on commercial listing sites, but without clear data, you don\'t know which ones are actually driving tours.',
      },
      {
        icon: '⚙️',
        title: 'Software that is hard to use',
        body: 'A lot of software requires a training manual to understand. Your brokers should be making deals, not fighting with complex menus.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'How we help',
    heading: 'We keep your listings accurate, automatically.',
    subheading:
      'PropertyGrid runs quietly in the background. It connects your main brokerage software to the rest of the internet, so you don\'t have to touch it.',
    features: [
      {
        icon: '🔌',
        title: 'Connects to what you already use',
        body: 'We plug directly into your existing CRM and management systems. You don\'t have to change how you work; we just read the data you already have.',
      },
      {
        icon: '🌐',
        title: 'Updates every site instantly',
        body: 'When you add a new property or change a lease rate, we instantly update LoopNet, Crexi, CoStar, and your brokerage\'s website.',
      },
      {
        icon: '📈',
        title: 'Compare where your properties lease fastest',
        body: 'We show you exactly how long your listings stay on each site before getting signed. You can finally see which platforms are actually helping you move space.',
      },
      {
        icon: '🗄️',
        title: 'A clear history of every change',
        body: 'If a rate dropped or a suite changed status, we keep a simple record of exactly when and where it happened, so you always know what is going on.',
      },
      {
        icon: '🤖',
        title: 'So simple you never have to log in',
        body: 'We built this to be invisible. Once our team sets it up, it works automatically. Your brokers don\'t have to learn another new tool to do their jobs.',
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
      { value: '15', suffix: '+', label: 'different commercial sites supported' },
      { value: '0', suffix: '', label: 'hours spent doing manual data entry' },
      { value: '1', suffix: '', label: 'simple dashboard for all your reports' },
    ],
    testimonial: {
      quote:
        'We used to spend hours re-typing zoning details and uploading floorplans to five different websites. Now we enter it once in our CRM, and it\'s everywhere. It just works.',
      author: 'Managing Director',
      role: 'Commercial Real Estate Firm',
    },
  },
  block5_cta: {
    heading: 'Ready to simplify your listings?',
    subheading:
      'Pricing is straightforward: $499 per month, per office. This covers the connection to your software, automatic updates to all your sites, and complete setup by our experts.',
    ctaLabel: 'Get started today',
    urgencyNote: 'We manage the entire onboarding process for you.',
  },
};
