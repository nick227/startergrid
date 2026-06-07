import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'DealerGrid — Easy Inventory Management for Dealerships',
    description:
      'DealerGrid connects your dealership software to all your online listing sites automatically. See which sites sell your cars and stop updating listings by hand.',
  },
  brand: {
    name: 'DealerGrid',
    tagline: 'Simple inventory automation for dealerships',
    accentColor: '#1d4ed8',
    accentColorDark: '#1e40af',
    accentColorLight: '#eff6ff',
    accentColorGlow: 'rgba(29, 78, 216, 0.18)',
  },
  audience: {
    label: 'dealers',
    industry: 'automotive',
    assetNoun: 'vehicles',
    channelNoun: 'listings',
  },
  block1_hero: {
    eyebrow: 'Inventory Automation',
    headline: 'Get your vehicles online fast. We handle the rest.',
    subheadline:
      'DealerGrid connects your dealership software directly to the sites where you sell cars. When a car arrives, it is listed automatically. When it sells, it is removed everywhere. No manual updates required.',
    ctaLabel: 'See how it works',
    ctaSecondaryLabel: 'View our pricing',
    trustItems: [
      'Works with CDK, Reynolds & Dealertrack',
      'No daily management needed',
      'We handle the complete setup',
    ],
  },
  block2_pain: {
    sectionLabel: 'The challenge',
    heading: 'Managing online inventory shouldn\'t be a full-time job.',
    subheading:
      'Most dealership software is far too complicated. And making sure your cars are listed correctly on every site simply takes too much time.',
    painPoints: [
      {
        icon: '📝',
        title: 'Typing the same details over and over',
        body: 'Having to manually enter the same vehicle details and upload photos to AutoTrader, Cars.com, and your own website is frustrating and leads to mistakes.',
      },
      {
        icon: '⏳',
        title: 'Sold cars are still online',
        body: 'When a vehicle sells on the lot, it often takes days to remove it from third-party sites. This leads to angry customers calling about cars you no longer have.',
      },
      {
        icon: '📊',
        title: 'Paying for sites that don\'t work',
        body: 'You are likely paying for several listing sites, but without clear data, you don\'t know which ones are actually driving people to your dealership.',
      },
      {
        icon: '⚙️',
        title: 'Software that is hard to use',
        body: 'A lot of software built for dealerships requires a training manual to understand. Your sales team should be selling cars, not fighting with complex menus.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'How we help',
    heading: 'We keep your inventory accurate, automatically.',
    subheading:
      'DealerGrid runs quietly in the background. It connects your main dealership software to the rest of the internet, so you don\'t have to touch it.',
    features: [
      {
        icon: '🔌',
        title: 'Connects to what you already use',
        body: 'We plug directly into CDK, Reynolds and Reynolds, and Dealertrack. You don\'t have to change how you work; we just read the data you already have.',
      },
      {
        icon: '🌐',
        title: 'Updates every site instantly',
        body: 'When you add a new car or change a price, we instantly update AutoTrader, Cars.com, CarGurus, Facebook Marketplace, and your dealership\'s website.',
      },
      {
        icon: '📈',
        title: 'Compare where your cars sell fastest',
        body: 'We show you exactly how long your vehicles stay on each site. You can finally see which platforms are actually helping you move inventory.',
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
        body: 'Our team has years of experience in digital auto sales. We handle the entire technical setup to get your dealership online quickly and correctly.',
      },
    ],
  },
  block4_proof: {
    sectionLabel: 'The results',
    heading: 'Trust the data, not the sales pitch.',
    stats: [
      { value: '100', suffix: '%', label: 'automatic updates across your sites' },
      { value: '40', suffix: '+', label: 'different sales sites supported' },
      { value: '0', suffix: '', label: 'hours spent doing manual data entry' },
      { value: '1', suffix: '', label: 'simple dashboard for all your reports' },
    ],
    testimonial: {
      quote:
        'We used to guess which advertising sites were worth the money. Now we know exactly how many days a car sits on each platform. It is so easy to use because it just does the work for us.',
      author: 'General Manager',
      role: 'Independent Dealership',
    },
  },
  block5_cta: {
    heading: 'Ready to simplify your inventory?',
    subheading:
      'Pricing is straightforward: $499 per month, per location. This covers the connection to your dealership software, automatic updates to all your sites, and complete setup by our experts.',
    ctaLabel: 'Get started today',
    urgencyNote: 'We manage the entire onboarding process for you.',
  },
};
