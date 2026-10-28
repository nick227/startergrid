export interface ValueProposition {
  number: string; // '01' through '10'
  id: string; // 'vp-01' through 'vp-10'
  title: string;
  summary: string;
  category: string;
  tag: string;
  keyPoints: string[];
  exampleType:
    | 'multi-channel'
    | 'marketplace'
    | 'advertising'
    | 'autopilot'
    | 'dms-connect'
    | 'expert-team'
    | 'leads-crm'
    | 'inventory-hub'
    | 'team-access'
    | 'market-demand';
}

export const TOP_TEN_VALUE_PROPOSITIONS: ValueProposition[] = [
  {
    number: '01',
    id: 'vp-01',
    title: 'Post your vehicles to 70+ websites from one platform.',
    summary: 'Compare what sells, where it sells, and how quickly.',
    category: 'Distribution & Reach',
    tag: 'Strongest Differentiator',
    keyPoints: [
      'Publish your active inventory across search engines, social media feeds, third-party marketplaces, and specialty listing sites.',
      'One vehicle update automatically updates all connected platforms—no manual double entry.',
      'Compare performance side-by-side: track average days to sell, inquiry volume, and sale price for every channel.',
      'Vehicles marked sold on your lot are removed from all destinations promptly to prevent wasted ad spend.',
    ],
    exampleType: 'multi-channel',
  },
  {
    number: '02',
    id: 'vp-02',
    title: 'List your vehicles for free on the DealerGrid Marketplace.',
    summary: 'Your own dealership showcase, direct buyer inquiries, and no listing fees or commissions.',
    category: 'First-Party Marketplace',
    tag: 'Zero Listing Fees',
    keyPoints: [
      'Every connected dealership receives verified listing pages on the consumer-facing DealerGrid Marketplace.',
      'Zero conquest advertising: competitors can never pay to put their ads or banners on your vehicle detail pages.',
      'Interested buyers contact your dealership sales desk directly via phone, direct message, or email.',
      'No commissions, no per-lead broker fees, and no middleman transaction surcharges.',
    ],
    exampleType: 'marketplace',
  },
  {
    number: '03',
    id: 'vp-03',
    title: 'Advertise your vehicles across social media, Google, Facebook, Instagram, and more.',
    summary: 'See which advertising platforms generate actual buyers.',
    category: 'Paid Advertising',
    tag: 'Multi-Platform Ads',
    keyPoints: [
      'Automated catalog feeds for Google Vehicle Ads, Meta Automotive Ads (Facebook & Instagram), TikTok, and Microsoft Bing.',
      'Vehicles are formatted to meet each advertising platform’s specific image, pricing, and spec guidelines.',
      'Link confirmed sales back to the advertising source that produced the buyer inquiry.',
      'View actual advertising spend alongside confirmed buyer inquiries to determine your true cost per lead.',
    ],
    exampleType: 'advertising',
  },
  {
    number: '04',
    id: 'vp-04',
    title: 'Set up automatic posting and real-time monitoring across sales and social media platforms.',
    summary: 'Schedule inventory updates, monitor listing activity, and identify issues from one dashboard.',
    category: 'Automation & Monitoring',
    tag: 'Autopilot Sync',
    keyPoints: [
      'Configure scheduled automatic updates (daily, hourly, or on lot price changes) so stock stays synchronized.',
      'Automated listing quality checks inspect VIN check digits, photo counts, and prices before listings export.',
      'Clear status indicators distinguish between connected accounts, submitted feeds, and verified live listings.',
      'Activity logs record export timestamps, platform responses, and any formatting warnings.',
    ],
    exampleType: 'autopilot',
  },
  {
    number: '05',
    id: 'vp-05',
    title: 'Connect your existing dealership software to one central inventory system.',
    summary: 'Work alongside CDK, Reynolds & Reynolds, Dealertrack, Tekion, and other DMS platforms to keep vehicle inventory organized and consistent.',
    category: 'DMS Coexistence',
    tag: 'Zero Disruption',
    keyPoints: [
      'Non-disruptive coexistence: your DMS remains the authoritative system of record for accounting, deals, and floorplanning.',
      'Supports inventory data outputs from CDK Global, Reynolds & Reynolds, Dealertrack, Frazer, DealerCenter, Tekion, and standard CSV exports.',
      'Automatic normalization maps trims, options, and exterior colors into consistent dealer-wide standards.',
      'No requirement to change your existing store operational software or back-office accounting.',
    ],
    exampleType: 'dms-connect',
  },
  {
    number: '06',
    id: 'vp-06',
    title: 'Work with our team of real experts in online auto sales.',
    summary: 'Get personal assistance with listing vehicles, managing advertising, and improving sales performance across platforms.',
    category: 'Expert Support',
    tag: 'Dedicated Specialist',
    keyPoints: [
      'Every dealership is paired with a dedicated onboarding specialist who knows dealership operations.',
      'Assisted DMS feed setup and catalog configuration tailored to your rooftop’s specific inventory mix.',
      'Guaranteed 1-business-day response time on technical questions, feed reviews, or new channel activations.',
      'Periodic account check-ins to review listing health, ad performance, and channel optimization opportunities.',
    ],
    exampleType: 'expert-team',
  },
  {
    number: '07',
    id: 'vp-07',
    title: 'Manage buyer inquiries from every connected source.',
    summary: 'Organize leads, assign salespeople, track follow-ups, and forward inquiries to your existing CRM.',
    category: 'Lead Management & CRM',
    tag: 'Unified Lead Inbox',
    keyPoints: [
      'Consolidate customer inquiries from marketplace listings, website feeds, and social ads into one shared inbox.',
      'Route leads into your existing CRM (Elead, VinSolutions, DriveCentric, CDK, Reynolds) via standard ADF 1.0 XML.',
      'Assign incoming inquiries to specific sales reps or BDC team members with status tracking (New, In Progress, Contacted, Sold).',
      'Track response times and communication history for every vehicle in your inventory.',
    ],
    exampleType: 'leads-crm',
  },
  {
    number: '08',
    id: 'vp-08',
    title: 'Manage your entire vehicle inventory from one dashboard.',
    summary: 'Import vehicles, update prices, organize photos, edit listings in bulk, and track availability.',
    category: 'Inventory Management',
    tag: 'Lot Control Hub',
    keyPoints: [
      'Comprehensive lot dashboard showing all active, pending, in-transit, and sold inventory in one view.',
      'Bulk price adjustments, custom dealer comments, and promotional badges applied across multiple vehicles at once.',
      'Photo manager with drag-and-drop ordering and minimum 6-slot automotive photo grid validation.',
      'Instant search and filter by stock number, VIN, make, model, year, body style, price, and days on lot.',
    ],
    exampleType: 'inventory-hub',
  },
  {
    number: '09',
    id: 'vp-09',
    title: 'Keep your dealership team working together.',
    summary: 'Manage staff access, assign responsibilities, and coordinate inventory, advertising, and customer inquiries.',
    category: 'Team Collaboration',
    tag: 'Role-Based Access',
    keyPoints: [
      'Role-based permissions tailored for General Managers, Inventory Directors, Sales Representatives, and BDC Staff.',
      'Audit log tracks who made price changes, modified listing descriptions, or adjusted channel settings.',
      'Multi-rooftop support allows dealer group executives to switch between store locations from a single login.',
      'Shared inventory notes help sales staff stay informed on vehicle reconditioning, test drives, and customer holds.',
    ],
    exampleType: 'team-access',
  },
  {
    number: '10',
    id: 'vp-10',
    title: 'Find out which vehicles are in demand in your market.',
    summary: 'Compare vehicle types, prices, and sales trends using available market and inventory data.',
    category: 'Market Intelligence',
    tag: 'Days-on-Lot Analytics',
    keyPoints: [
      'Track vehicle aging across practical brackets: 0–15 days, 16–30 days, 31–60 days, and 60+ days.',
      'Identify slow-moving stock before holding costs and floorplan interest build up.',
      'Analyze demand patterns by vehicle category (Trucks, SUVs, Sedans, Commercial) to inform your lot acquisition strategy.',
      'Minimum sample size safeguards (N ≥ 5 units) prevent misleading conclusions from small numbers of sales.',
    ],
    exampleType: 'market-demand',
  },
];
