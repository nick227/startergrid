import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'EquipmentGrid — Easy Inventory Management for Heavy Equipment Dealers',
    description:
      'EquipmentGrid connects your dealership software to all your online listing sites automatically. See which sites sell your machinery and stop updating listings by hand.',
  },
  brand: {
    name: 'EquipmentGrid',
    tagline: 'Simple inventory automation for heavy equipment dealers',
    accentColor: '#eab308', // yellow-500
    accentColorDark: '#ca8a04', // yellow-600
    accentColorLight: '#fef08a', // yellow-200
    accentColorGlow: 'rgba(234, 179, 8, 0.18)',
  },
  audience: {
    label: 'dealers',
    industry: 'heavy equipment',
    assetNoun: 'machines',
    channelNoun: 'listings',
  },
  block1_hero: {
    eyebrow: 'Inventory Automation',
    headline: 'Get your machinery online fast. We handle the rest.',
    subheadline:
      'EquipmentGrid connects your dealership software directly to the sites where you sell heavy equipment. When a machine arrives, it is listed automatically. When it sells, it is removed everywhere. No manual updates required.',
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
      'Entering complex specs, hours, and serial numbers across multiple websites takes too much time, and making sure your listings are accurate is a constant headache.',
    painPoints: [
      {
        icon: '📝',
        title: 'Typing the same details over and over',
        body: 'Having to manually enter complex machine specs to Machinery Trader, Equipment Trader, and your own website is frustrating and leads to mistakes.',
      },
      {
        icon: '⏳',
        title: 'Sold machines are still online',
        body: 'When a piece of equipment sells on the lot, it often takes days to remove it from third-party sites. This leads to angry customers calling about inventory you no longer have.',
      },
      {
        icon: '📊',
        title: 'Paying for sites that don\'t work',
        body: 'You are likely paying for several listing sites, but without clear data, you don\'t know which ones are actually driving people to your dealership.',
      },
      {
        icon: '⚙️',
        title: 'Software that is hard to use',
        body: 'A lot of software requires a training manual to understand. Your sales team should be selling, not fighting with complex menus.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'How we help',
    heading: 'We keep your inventory accurate, automatically.',
    subheading:
      'EquipmentGrid runs quietly in the background. It connects your main dealership software to the rest of the internet, so you don\'t have to touch it.',
    features: [
      {
        icon: '🔌',
        title: 'Connects to what you already use',
        body: 'We plug directly into your existing management systems. You don\'t have to change how you work; we just read the data you already have.',
      },
      {
        icon: '🌐',
        title: 'Updates every site instantly',
        body: 'When you add a new machine or change a price, we instantly update Machinery Trader, Equipment Trader, Facebook Marketplace, and your dealership\'s website.',
      },
      {
        icon: '📈',
        title: 'Compare where your machines sell fastest',
        body: 'We show you exactly how long your inventory stays on each site. You can finally see which platforms are actually helping you move equipment.',
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
        body: 'Our team has years of experience in digital sales. We handle the entire technical setup to get your dealership online quickly and correctly.',
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
        'We used to spend hours re-typing hour meter readings and uploading photos to five different websites. Now we enter it once in our system, and it\'s everywhere. It just works.',
      author: 'Sales Manager',
      role: 'Regional Equipment Dealership',
    },
  },
  block5_cta: {
    heading: 'Ready to simplify your inventory?',
    subheading:
      'Pricing is straightforward: $399 per month, per location. This covers the connection to your software, automatic updates to all your sites, and complete setup by our experts.',
    ctaLabel: 'Get started today',
    urgencyNote: 'We manage the entire onboarding process for you.',
  },
};
