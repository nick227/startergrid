import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'VideoGrid — Easy Distribution Management for Creators and Studios',
    description:
      'VideoGrid connects your catalog to all online streaming sites automatically. See which platforms find viewers faster and stop uploading videos by hand.',
  },
  brand: {
    name: 'VideoGrid',
    tagline: 'Simple distribution automation for video creators',
    accentColor: '#14b8a6', // teal-500
    accentColorDark: '#0f766e', // teal-700
    accentColorLight: '#ccfbf1', // teal-100
    accentColorGlow: 'rgba(20, 184, 166, 0.18)',
  },
  audience: {
    label: 'creators',
    industry: 'video distribution',
    assetNoun: 'videos',
    channelNoun: 'platforms',
  },
  block1_hero: {
    eyebrow: 'Distribution Automation',
    headline: 'Get your videos online fast. We handle the rest.',
    subheadline:
      'VideoGrid connects your catalog directly to the sites where viewers stream video. When a video is ready, it is distributed automatically. When you need to update a thumbnail or description, it is updated everywhere. No manual uploads required.',
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
      'Entering titles, tags, and thumbnails across multiple websites takes too much time, and making sure your videos are accurate is a constant headache.',
    painPoints: [
      {
        icon: '📝',
        title: 'Typing the same details over and over',
        body: 'Having to manually enter complex video specs to YouTube, Vimeo, and your own website is frustrating and leads to mistakes.',
      },
      {
        icon: '⏳',
        title: 'Updates take forever to show up',
        body: 'When you need to change a title or fix a typo in the description, it often takes days to update on third-party sites. This leads to frustrated viewers and lost views.',
      },
      {
        icon: '📊',
        title: 'Paying for promotion that doesn\'t work',
        body: 'You are likely spending money on marketing, but without clear data, you don\'t know which platforms are actually driving views for your catalog.',
      },
      {
        icon: '⚙️',
        title: 'Software that is hard to use',
        body: 'A lot of distribution software requires a training manual to understand. You should be making videos, not fighting with complex menus.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'How we help',
    heading: 'We keep your catalog accurate, automatically.',
    subheading:
      'VideoGrid runs quietly in the background. It connects your main catalog to the rest of the internet, so you don\'t have to touch it.',
    features: [
      {
        icon: '🔌',
        title: 'Connects to what you already use',
        body: 'We plug directly into your existing management systems. You don\'t have to change how you work; we just read the data you already have.',
      },
      {
        icon: '🌐',
        title: 'Updates every site instantly',
        body: 'When you add a new video or change a thumbnail, we instantly update YouTube, Vimeo, TikTok, and your creator website.',
      },
      {
        icon: '📈',
        title: 'Compare where your videos get views fastest',
        body: 'We show you exactly how many views your videos get on each site. You can finally see which platforms are actually helping you grow your audience.',
      },
      {
        icon: '🗄️',
        title: 'A clear history of every change',
        body: 'If metadata changed or a video was taken down, we keep a simple record of exactly when and where it happened, so you always know what is going on.',
      },
      {
        icon: '🤖',
        title: 'So simple you never have to log in',
        body: 'We built this to be invisible. Once our team sets it up, it works automatically. You don\'t have to learn another new tool to release videos.',
      },
      {
        icon: '👥',
        title: 'We do the hard work for you',
        body: 'Our team has years of experience in digital video. We handle the entire technical setup to get your catalog online quickly and correctly.',
      },
    ],
  },
  block4_proof: {
    sectionLabel: 'The results',
    heading: 'Trust the data, not the sales pitch.',
    stats: [
      { value: '100', suffix: '%', label: 'automatic updates across your platforms' },
      { value: '20', suffix: '+', label: 'different video sites supported' },
      { value: '0', suffix: '', label: 'hours spent doing manual uploads' },
      { value: '1', suffix: '', label: 'simple dashboard for all your reports' },
    ],
    testimonial: {
      quote:
        'We used to spend hours re-typing tags and uploading massive MP4 files to five different platforms. Now we enter it once in our system, and it\'s everywhere. It just works.',
      author: 'Studio Manager',
      role: 'Independent Content Studio',
    },
  },
  block5_cta: {
    heading: 'Ready to simplify your distribution?',
    subheading:
      'Pricing is straightforward: $199 per month, per channel. This covers the connection to your catalog, automatic updates to all your sites, and complete setup by our experts.',
    ctaLabel: 'Get started today',
    urgencyNote: 'We manage the entire onboarding process for you.',
  },
};
