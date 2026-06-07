import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'WatchGrid — Easy Inventory Management for Luxury Watch Dealers',
    description:
      'WatchGrid connects your inventory software to all your online listing sites automatically. See which sites sell your watches and stop updating listings by hand.',
  },
  brand: {
    name: 'WatchGrid',
    tagline: 'Simple inventory automation for watch dealers',
    accentColor: '#0f766e', // teal-700
    accentColorDark: '#115e59', // teal-800
    accentColorLight: '#ccfbf1', // teal-100
    accentColorGlow: 'rgba(15, 118, 110, 0.18)',
  },
  audience: {
    label: 'dealers',
    industry: 'luxury watches',
    assetNoun: 'watches',
    channelNoun: 'listings',
  },
  block1_hero: {
    eyebrow: 'Inventory Automation',
    headline: 'Get your timepieces online fast. We handle the rest.',
    subheadline:
      'WatchGrid connects your inventory software directly to the sites where you sell luxury watches. When a piece arrives, it is listed automatically. When it sells, it is removed everywhere. No manual updates required.',
    ctaLabel: 'See how it works',
    ctaSecondaryLabel: 'View our pricing',
    trustItems: [
      'Works with your existing software',
      'No daily management needed',
      'We handle the complete setup',
    ],
  },
  block2_pain: {
    sectionLabel: 'The challenge',
    heading: 'Managing online inventory shouldn\'t be a full-time job.',
    subheading:
      'Entering reference numbers, condition details, and photos across multiple websites takes too much time, and making sure your listings are accurate is a constant headache.',
    painPoints: [
      {
        icon: '📝',
        title: 'Typing the same details over and over',
        body: 'Having to manually enter complex watch specs to Chrono24, eBay, and your own website is frustrating and leads to mistakes.',
      },
      {
        icon: '⏳',
        title: 'Sold watches are still online',
        body: 'When a piece sells in-store, it often takes hours or days to remove it from third-party sites. This leads to angry customers calling about inventory you no longer have.',
      },
      {
        icon: '📊',
        title: 'Paying for sites that don\'t work',
        body: 'You are likely paying fees to several listing sites, but without clear data, you don\'t know which ones are actually driving sales to your business.',
      },
      {
        icon: '⚙️',
        title: 'Software that is hard to use',
        body: 'A lot of inventory software requires a training manual to understand. Your sales team should be selling, not fighting with complex menus.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'How we help',
    heading: 'We keep your inventory accurate, automatically.',
    subheading:
      'WatchGrid runs quietly in the background. It connects your main inventory software to the rest of the internet, so you don\'t have to touch it.',
    features: [
      {
        icon: '🔌',
        title: 'Connects to what you already use',
        body: 'We plug directly into your existing management systems. You don\'t have to change how you work; we just read the data you already have.',
      },
      {
        icon: '🌐',
        title: 'Updates every site instantly',
        body: 'When you add a new watch or change a price, we instantly update Chrono24, eBay, Facebook Marketplace, and your dealership\'s website.',
      },
      {
        icon: '📈',
        title: 'Compare where your watches sell fastest',
        body: 'We show you exactly how long your inventory stays on each site. You can finally see which platforms are actually helping you move pieces.',
      },
      {
        icon: '🗄️',
        title: 'A clear history of every change',
        body: 'If a price changed or a listing was removed, we keep a simple record of exactly when and where it happened, so you always know what is going on.',
      },
      {
        icon: '🤖',
        title: 'So simple you never have to log in',
        body: 'We built this to be invisible. Once our team sets it up, it works automatically. Your sales team doesn\'t have to learn another new tool to do their jobs.',
      },
      {
        icon: '👥',
        title: 'We do the hard work for you',
        body: 'Our team has years of experience in digital sales. We handle the entire technical setup to get your inventory online quickly and correctly.',
      },
    ],
  },
  block4_proof: {
    sectionLabel: 'The results',
    heading: 'Trust the data, not the sales pitch.',
    stats: [
      { value: '100', suffix: '%', label: 'automatic updates across your sites' },
      { value: '15', suffix: '+', label: 'different sales sites supported' },
      { value: '0', suffix: '', label: 'hours spent doing manual data entry' },
      { value: '1', suffix: '', label: 'simple dashboard for all your reports' },
    ],
    testimonial: {
      quote:
        'We used to spend hours re-typing reference numbers and uploading photos to five different websites. Now we enter it once in our system, and it\'s everywhere. It just works.',
      author: 'Store Manager',
      role: 'Independent Watch Dealer',
    },
  },
  block5_cta: {
    heading: 'Ready to simplify your inventory?',
    subheading:
      'Pricing is straightforward: $199 per month, per location. This covers the connection to your software, automatic updates to all your sites, and complete setup by our experts.',
    ctaLabel: 'Get started today',
    urgencyNote: 'We manage the entire onboarding process for you.',
  },
};
