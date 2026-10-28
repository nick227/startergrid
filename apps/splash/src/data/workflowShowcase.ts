export interface WorkflowStep {
  id: 'inventory' | 'channels' | 'leads' | 'performance';
  number: string;
  tabLabel: string;
  headline: string;
  summary: string;
  details: string[];
  screenData: {
    title: string;
    routePath: string;
    badgeText: string;
    columns: string[];
    sampleRows: Array<{
      col1: string;
      col2: string;
      col3: string;
      col4: string;
      status: string;
      statusVariant: 'success' | 'warning' | 'info' | 'neutral';
    }>;
    notes: string;
  };
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'inventory',
    number: '01',
    tabLabel: '1. Inventory',
    headline: 'Import vehicle records, review changes, and prepare listings for connected channels.',
    summary:
      'Manage active lot vehicles directly or ingest regular CSV, XML, or API exports from your DMS. Inspect 17-character VIN decodes, enforce the required photo taxonomy, apply absolute bulk price updates, and record sold transitions.',
    details: [
      'Standardized CSV and batch VIN intake preserving unique stock numbers',
      'NHTSA ISO-3779 VIN decoding for year, make, model, engine, and trim',
      'Enforced automotive shot grid: Front 3/4, Rear 3/4, Cockpit, Odometer, Cargo, Window Sticker',
      'Absolute bulk pricing changes applied across filtered vehicle subsets',
      'One-click transition to Sold with timestamped archive records',
    ],
    screenData: {
      title: 'Vehicles — Active Lot Inventory',
      routePath: '/app/#/austin-auto/inventory',
      badgeText: '148 Active Vehicles',
      columns: ['Stock / VIN', 'Vehicle Details', 'Price', 'Photos', 'Listing Status'],
      sampleRows: [
        {
          col1: 'STK-22084\n1FTFW1ED4NFA10928',
          col2: '2022 Ford F-150 Lariat\nSuperCrew 4WD Hybrid',
          col3: '$46,990',
          col4: '22 / 20 slots',
          status: 'Ready to send',
          statusVariant: 'success',
        },
        {
          col1: 'STK-23119\n2T3P1RFV5PW219842',
          col2: '2023 Toyota RAV4 XLE\nAWD 2.5L 4-Cyl',
          col3: '$29,850',
          col4: '18 / 16 slots',
          status: 'Ready to send',
          statusVariant: 'success',
        },
        {
          col1: 'STK-21045\nWBA5R7C56MFA83910',
          col2: '2021 BMW 330i xDrive\n2.0L Turbo Sedan',
          col3: '$31,500',
          col4: '14 / 16 slots',
          status: 'Needs details',
          statusVariant: 'warning',
        },
        {
          col1: 'STK-24012\n1GNSKRKD8RR198302',
          col2: '2024 Chevrolet Tahoe RST\n5.3L V8 4WD',
          col3: '$64,250',
          col4: '4 / 6 min',
          status: 'Cannot list',
          statusVariant: 'neutral',
        },
      ],
      notes: 'Vehicles missing required details remain on your lot but are blocked from external export until corrected.',
    },
  },
  {
    id: 'channels',
    number: '02',
    tabLabel: '2. Channels',
    headline: 'Connect advertising channels, check listing quality, and monitor publishing status.',
    summary:
      'Manage which platforms receive your inventory. Configure automatic scheduled updates, review listing quality checks before sending, and easily track what is connected, what has been sent, and what is currently live.',
    details: [
      'Organized by purpose: Marketplaces, Social Advertising, Feeds, and Lead Delivery',
      'Automatic scheduled updates for catalog sync and feed export',
      'Quality checks prevent missing photos, prices, or specs from getting rejected',
      'Publish status clearly separates configured channels from active listings',
      'Activity logs record export attempts and provider status responses',
    ],
    screenData: {
      title: 'Channels & Sales Intelligence',
      routePath: '/app/#/austin-auto/platforms',
      badgeText: '8 Configured Channels',
      columns: ['Destination', 'Purpose', 'Delivery Method', 'Verified Live', 'Channel Status'],
      sampleRows: [
        {
          col1: 'Auto Marketplace',
          col2: 'Marketplaces',
          col3: 'Direct Listing Bridge',
          col4: '148 live units',
          status: 'Connected',
          statusVariant: 'success',
        },
        {
          col1: 'Google Vehicle Ads',
          col2: 'Social & Advertising',
          col3: 'Merchant Center API',
          col4: '136 compliant',
          status: 'Connected',
          statusVariant: 'success',
        },
        {
          col1: 'Meta Automotive Ads',
          col2: 'Social & Advertising',
          col3: 'Graph Catalog API',
          col4: '142 catalog items',
          status: 'Connected',
          statusVariant: 'success',
        },
        {
          col1: 'eBay Motors',
          col2: 'Marketplaces',
          col3: 'Direct Trading API',
          col4: '1 item paused',
          status: 'Needs attention',
          statusVariant: 'warning',
        },
      ],
      notes: 'A connected account does not guarantee live listings. StarterGrid tracks external confirmation separately.',
    },
  },
  {
    id: 'leads',
    number: '03',
    tabLabel: '3. Leads',
    headline: 'Track buyer inquiries, assign follow-up, and review CRM delivery outcomes.',
    summary:
      'Consolidate prospective buyer inquiries across connected platforms into a unified inbox. Inspect buyer contact details, matched vehicles, and delivery receipts into your dealership CRM with industry-standard ADF/XML handoff.',
    details: [
      'Centralized inquiry log with buyer name, email, phone, and vehicle stock number',
      'Direct CRM handoff via Auto-lead Data Format (ADF) 1.0 XML over SMTP',
      'Mail-server acceptance confirmation to verify your CRM received the lead',
      'Real-time staff alerts via Webhooks, Email, Discord, Telegram, and SMS',
      'Shared lead statuses: New, Contacted, Appointment, Closed, and Lost',
    ],
    screenData: {
      title: 'Inquiries & CRM Delivery Log',
      routePath: '/app/#/austin-auto/leads',
      badgeText: '42 Recent Inquiries',
      columns: ['Buyer & Source', 'Vehicle Stock', 'Inquiry Type', 'Delivery Status', 'Follow-up'],
      sampleRows: [
        {
          col1: 'Marcus Vance\nAuto Marketplace',
          col2: 'STK-22084\n2022 Ford F-150',
          col3: 'Schedule Test Drive',
          col4: 'Accepted by CRM',
          status: 'Contacted',
          statusVariant: 'success',
        },
        {
          col1: 'Sarah Jenkins\nGoogle Vehicle Ads',
          col2: 'STK-23119\n2023 Toyota RAV4',
          col3: 'Price & Availability',
          col4: 'Accepted by CRM',
          status: 'Appointment',
          statusVariant: 'info',
        },
        {
          col1: 'David Chen\nMeta Automotive Ads',
          col2: 'STK-21045\n2021 BMW 330i',
          col3: 'Trade-in Estimate',
          col4: 'Accepted by CRM',
          status: 'New',
          statusVariant: 'warning',
        },
        {
          col1: 'Robert Taylor\nAuto Marketplace',
          col2: 'STK-24012\n2024 Chevy Tahoe',
          col3: 'General Question',
          col4: 'Manual Copy Ready',
          status: 'New',
          statusVariant: 'neutral',
        },
      ],
      notes: 'Mail-server acceptance confirms transmission to your CRM; salesperson follow-up is tracked in the shared inbox.',
    },
  },
  {
    id: 'performance',
    number: '04',
    tabLabel: '4. Performance',
    headline: 'Compare recorded buyer inquiries and actual sales by channel.',
    summary:
      'Evaluate your advertising spend by comparing marketing costs, buyer inquiries, and confirmed car sales. Every metric carries a clear evidence badge so you know which numbers are verified.',
    details: [
      'Side-by-side comparison of channel fee, ad spend, inquiries, and attributed sales',
      'Sales desk confirmations take precedence over automated inquiry matching',
      'Clear badges: [Observed] platform counts, [Dealer Reported] ad spend, [Attributed] verified sales',
      'Days on lot and inventory turn analysis across body styles (Trucks, SUVs, Sedans)',
      'Minimum sample threshold (N ≥ 5 units) to avoid misleading small-sample conclusions',
    ],
    screenData: {
      title: 'Channel Commercial Comparison',
      routePath: '/app/#/austin-auto/platforms?tab=performance',
      badgeText: 'Audit Period: Q3 Reference',
      columns: ['Channel Name', 'Spend', 'Recorded Leads', 'Attributed Sales', 'Evidence Tier'],
      sampleRows: [
        {
          col1: 'Auto Marketplace (Owned)',
          col2: '$0 / mo',
          col3: '34 inquiries',
          col4: '5 confirmed sold',
          status: '[Observed]',
          statusVariant: 'success',
        },
        {
          col1: 'Google Vehicle Ads',
          col2: '$980 ad spend',
          col3: '62 inquiries',
          col4: '8 confirmed sold',
          status: '[Attributed]',
          statusVariant: 'info',
        },
        {
          col1: 'Meta Automotive Ads',
          col2: '$750 ad spend',
          col3: '39 inquiries',
          col4: '4 confirmed sold',
          status: '[Attributed]',
          statusVariant: 'info',
        },
        {
          col1: 'CarGurus Dealer Network',
          col2: '$1,450 subscription',
          col3: '48 reported',
          col4: '6 confirmed sold',
          status: '[Reported]',
          statusVariant: 'warning',
        },
      ],
      notes: 'Vehicle sale records, channel tracking, and data sources remain clearly separated.',
    },
  },
];
