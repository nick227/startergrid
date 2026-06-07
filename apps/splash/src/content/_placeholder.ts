/**
 * _placeholder.ts
 *
 * Stub content used for all categories that don't have a full copy file yet.
 * Replace with a category-specific file (e.g. boats.ts) when ready.
 *
 * Readable enough to demonstrate the layout without broken UI.
 */
import type { SplashContent } from '../types/content.ts';

export const content: SplashContent = {
  meta: {
    title: 'Category Automation Platform — StarterGrid',
    description:
      'StarterGrid helps industry operators automate listings, sync inventory, and sell faster.',
  },
  brand: {
    name: '[Industry]Grid',
    tagline: 'The automation platform built for your industry',
    accentColor: '#2e6294',
    accentColorDark: '#1a3a5c',
    accentColorLight: '#eef4fa',
    accentColorGlow: 'rgba(46, 98, 148, 0.18)',
  },
  audience: {
    label: 'operators',
    industry: 'your industry',
    assetNoun: 'assets',
    channelNoun: 'listings',
  },
  block1_hero: {
    eyebrow: 'Built for your industry',
    headline: 'Stop managing <em>listings</em> by hand.',
    subheadline:
      'The automation platform that keeps your inventory in sync across every sales channel — so you can focus on closing.',
    ctaLabel: 'Request a demo',
    ctaSecondaryLabel: 'See how it works',
    trustItems: ['No credit card required', 'Setup in under a day', 'Cancel anytime'],
  },
  block2_pain: {
    sectionLabel: 'Sound familiar?',
    heading: 'Running your business is hard enough without broken tools.',
    subheading: 'We hear the same problems from operators across this industry every day.',
    painPoints: [
      {
        icon: '⏱️',
        title: 'Too much time on manual updates',
        body: 'Your team spends hours every week copy-pasting listings across channels instead of selling.',
      },
      {
        icon: '📉',
        title: 'Stale inventory everywhere',
        body: 'Sold items stay live. New arrivals go unannounced. Your buyers lose trust.',
      },
      {
        icon: '📊',
        title: 'No real performance data',
        body: "You don't know which listings convert, which channels pull weight, or where you're bleeding margin.",
      },
      {
        icon: '🔌',
        title: 'Tools that don't talk to each other',
        body: 'Your CRM, website, and sales platforms all live in silos. Nothing syncs automatically.',
      },
    ],
  },
  block3_features: {
    sectionLabel: 'The platform',
    heading: 'One platform. Every channel. Fully automated.',
    subheading:
      'StarterGrid connects your inventory to every sales channel and keeps everything in sync — automatically.',
    features: [
      {
        icon: '⚡',
        title: 'Instant inventory sync',
        body: 'Connect your source of record once. Every channel updates automatically when inventory changes.',
      },
      {
        icon: '📡',
        title: 'Multi-channel publishing',
        body: 'Push to your website, marketplace, and partner platforms from a single dashboard.',
      },
      {
        icon: '📈',
        title: 'Performance analytics',
        body: 'See which listings generate the most interest, leads, and sales — in real time.',
      },
      {
        icon: '🔔',
        title: 'Smart alerts',
        body: 'Get notified when inventory needs attention before it affects your pipeline.',
      },
      {
        icon: '🎯',
        title: 'Lead capture',
        body: 'Every listing is a lead-generation asset, with built-in inquiry forms and routing.',
      },
      {
        icon: '🛡️',
        title: 'Audit trail',
        body: 'Every sync, every change, every action — logged and reviewable at any time.',
      },
    ],
  },
  block4_proof: {
    sectionLabel: 'Real results',
    heading: 'Operators see results within the first 30 days.',
    stats: [
      { value: '14', suffix: 'hrs', label: 'saved per week on average' },
      { value: '3', suffix: 'x', label: 'faster time to market' },
      { value: '98', suffix: '%', label: 'inventory accuracy rate' },
      { value: '60', suffix: '+', label: 'channel integrations' },
    ],
    testimonial: {
      quote:
        'We went from spending half a day on listings to having everything live in minutes. It changed how our whole team operates.',
      author: 'Operations Manager',
      role: 'Multi-location operator',
    },
  },
  block5_cta: {
    heading: 'Ready to automate your operation?',
    subheading:
      'Join operators who have replaced manual work with a system that just works. Get a personalized walkthrough today.',
    ctaLabel: 'Request your demo',
    urgencyNote: 'No credit card required · Onboard in under a day',
  },
};
