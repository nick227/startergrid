import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'BookGrid — Easy Distribution Management for Publishers',
    description:
      'BookGrid connects your catalog to all online retail sites automatically. See which platforms find readers faster and stop uploading files by hand.',
  },
  brand: {
    name: 'BookGrid',
    tagline: 'Simple distribution automation for publishers and authors',
    accentColor: '#d97706', // amber-600
    accentColorDark: '#b45309', // amber-700
    accentColorLight: '#fef3c7', // amber-100
    accentColorGlow: 'rgba(217, 119, 6, 0.18)',
  },
  audience: {
    label: 'publishers',
    industry: 'publishing',
    assetNoun: 'books',
    channelNoun: 'platforms',
  },
  block1_hero: {
    eyebrow: 'Distribution Automation',
    headline: 'Get your books online fast. We handle the rest.',
    subheadline:
      'BookGrid connects your catalog directly to the sites where readers buy books. When a title is ready, it is distributed automatically. When you need to update a cover or price, it is updated everywhere. No manual uploads required.',
    ctaLabel: 'See how it works',
    ctaSecondaryLabel: 'View our pricing',
    trustItems: [
      'Works with your existing workflow',
      'No daily management needed',
      'We handle the complete setup',
    ],
  },
  block2_pain: {
    sectionLabel: 'The challenge',
    heading: 'Managing online distribution shouldn\'t be a full-time job.',
    subheading:
      'Entering ISBNs, blurbs, and author bios across multiple websites takes too much time, and making sure your catalog is accurate is a constant headache.',
    painPoints: [
      {
        icon: '📝',
        title: 'Typing the same details over and over',
        body: 'Having to manually enter complex book specs to Amazon, Apple Books, and your own website is frustrating and leads to mistakes.',
      },
      {
        icon: '⏳',
        title: 'Updates take forever to show up',
        body: 'When you need to change a price or fix a typo in the description, it often takes days to update on third-party sites. This leads to frustrated readers and lost sales.',
      },
      {
        icon: '📊',
        title: 'Paying for promotion that doesn\'t work',
        body: 'You are likely spending money on marketing, but without clear data, you don\'t know which platforms are actually driving sales for your catalog.',
      },
      {
        icon: '⚙️',
        title: 'Software that is hard to use',
        body: 'A lot of distribution software requires a training manual to understand. You should be publishing books, not fighting with complex menus.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'How we help',
    heading: 'We keep your catalog accurate, automatically.',
    subheading:
      'BookGrid runs quietly in the background. It connects your main catalog to the rest of the internet, so you don\'t have to touch it.',
    features: [
      {
        icon: '🔌',
        title: 'Connects to what you already use',
        body: 'We plug directly into your existing management systems. You don\'t have to change how you work; we just read the data you already have.',
      },
      {
        icon: '🌐',
        title: 'Updates every site instantly',
        body: 'When you add a new book or change a price, we instantly update Amazon, Apple Books, Barnes & Noble, and your publisher website.',
      },
      {
        icon: '📈',
        title: 'Compare where your books sell fastest',
        body: 'We show you exactly how many sales your titles get on each site. You can finally see which platforms are actually helping you grow your audience.',
      },
      {
        icon: '🗄️',
        title: 'A clear history of every change',
        body: 'If metadata changed or a book was unpublished, we keep a simple record of exactly when and where it happened, so you always know what is going on.',
      },
      {
        icon: '🤖',
        title: 'So simple you never have to log in',
        body: 'We built this to be invisible. Once our team sets it up, it works automatically. You don\'t have to learn another new tool to release books.',
      },
      {
        icon: '👥',
        title: 'We do the hard work for you',
        body: 'Our team has years of experience in digital publishing. We handle the entire technical setup to get your catalog online quickly and correctly.',
      },
    ],
  },
  block4_proof: {
    sectionLabel: 'The results',
    heading: 'Trust the data, not the sales pitch.',
    stats: [
      { value: '100', suffix: '%', label: 'automatic updates across your platforms' },
      { value: '15', suffix: '+', label: 'different retail sites supported' },
      { value: '0', suffix: '', label: 'hours spent doing manual uploads' },
      { value: '1', suffix: '', label: 'simple dashboard for all your reports' },
    ],
    testimonial: {
      quote:
        'We used to spend hours re-typing ISBNs and uploading ePub files to five different retailers. Now we enter it once in our system, and it\'s everywhere. It just works.',
      author: 'Operations Manager',
      role: 'Independent Publishing House',
    },
  },
  block5_cta: {
    heading: 'Ready to simplify your distribution?',
    subheading:
      'Pricing is straightforward: $99 per month, per imprint. This covers the connection to your catalog, automatic updates to all your sites, and complete setup by our experts.',
    ctaLabel: 'Get started today',
    urgencyNote: 'We manage the entire onboarding process for you.',
  },
};
