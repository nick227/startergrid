import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'MusicGrid — Easy Distribution Management for Independent Artists',
    description:
      'MusicGrid connects your catalog to all online streaming sites automatically. See which platforms find listeners faster and stop uploading tracks by hand.',
  },
  brand: {
    name: 'MusicGrid',
    tagline: 'Simple distribution automation for independent artists',
    accentColor: '#ec4899', // pink-500
    accentColorDark: '#be185d', // pink-700
    accentColorLight: '#fce7f3', // pink-100
    accentColorGlow: 'rgba(236, 72, 153, 0.18)',
  },
  audience: {
    label: 'artists',
    industry: 'music',
    assetNoun: 'tracks',
    channelNoun: 'platforms',
  },
  block1_hero: {
    eyebrow: 'Distribution Automation',
    headline: 'Get your music online fast. We handle the rest.',
    subheadline:
      'MusicGrid connects your catalog directly to the sites where fans stream music. When a track is ready, it is distributed automatically. When you need to update metadata, it is updated everywhere. No manual uploads required.',
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
      'Entering cover art, ISRC codes, and credits across multiple websites takes too much time, and making sure your releases are accurate is a constant headache.',
    painPoints: [
      {
        icon: '📝',
        title: 'Typing the same details over and over',
        body: 'Having to manually enter complex track specs to Spotify, Apple Music, and your own website is frustrating and leads to mistakes.',
      },
      {
        icon: '⏳',
        title: 'Updates take forever to show up',
        body: 'When you need to change a release date or fix a typo, it often takes days to update on third-party sites. This leads to frustrated fans and missed opportunities.',
      },
      {
        icon: '📊',
        title: 'Paying for promotion that doesn\'t work',
        body: 'You are likely spending money on marketing, but without clear data, you don\'t know which platforms are actually driving streams to your catalog.',
      },
      {
        icon: '⚙️',
        title: 'Software that is hard to use',
        body: 'A lot of distribution software requires a training manual to understand. You should be making music, not fighting with complex menus.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'How we help',
    heading: 'We keep your catalog accurate, automatically.',
    subheading:
      'MusicGrid runs quietly in the background. It connects your main catalog to the rest of the internet, so you don\'t have to touch it.',
    features: [
      {
        icon: '🔌',
        title: 'Connects to what you already use',
        body: 'We plug directly into your existing management systems. You don\'t have to change how you work; we just read the data you already have.',
      },
      {
        icon: '🌐',
        title: 'Updates every site instantly',
        body: 'When you add a new track or change a release date, we instantly update Spotify, Apple Music, TikTok, and your artist website.',
      },
      {
        icon: '📈',
        title: 'Compare where your music streams fastest',
        body: 'We show you exactly how many streams your tracks get on each site. You can finally see which platforms are actually helping you grow your audience.',
      },
      {
        icon: '🗄️',
        title: 'A clear history of every change',
        body: 'If metadata changed or a track was taken down, we keep a simple record of exactly when and where it happened, so you always know what is going on.',
      },
      {
        icon: '🤖',
        title: 'So simple you never have to log in',
        body: 'We built this to be invisible. Once our team sets it up, it works automatically. You don\'t have to learn another new tool to release music.',
      },
      {
        icon: '👥',
        title: 'We do the hard work for you',
        body: 'Our team has years of experience in digital music. We handle the entire technical setup to get your catalog online quickly and correctly.',
      },
    ],
  },
  block4_proof: {
    sectionLabel: 'The results',
    heading: 'Trust the data, not the sales pitch.',
    stats: [
      { value: '100', suffix: '%', label: 'automatic updates across your platforms' },
      { value: '50', suffix: '+', label: 'different streaming sites supported' },
      { value: '0', suffix: '', label: 'hours spent doing manual uploads' },
      { value: '1', suffix: '', label: 'simple dashboard for all your reports' },
    ],
    testimonial: {
      quote:
        'We used to spend hours re-typing ISRC codes and uploading WAV files to five different distributors. Now we enter it once in our system, and it\'s everywhere. It just works.',
      author: 'Label Manager',
      role: 'Independent Record Label',
    },
  },
  block5_cta: {
    heading: 'Ready to simplify your distribution?',
    subheading:
      'Pricing is straightforward: $49 per month, per artist. This covers the connection to your catalog, automatic updates to all your sites, and complete setup by our experts.',
    ctaLabel: 'Get started today',
    urgencyNote: 'We manage the entire onboarding process for you.',
  },
};
