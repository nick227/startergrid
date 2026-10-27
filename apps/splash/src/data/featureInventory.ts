export interface FeaturePillar {
  id: string;
  pillarNumber: string;
  title: string;
  subtitle: string;
  icon: string;
  capabilities: {
    name: string;
    description: string;
    evidenceOrStatus: string;
  }[];
}

export const FEATURE_INVENTORY: FeaturePillar[] = [
  {
    id: 'inventory-core',
    pillarNumber: '01',
    title: 'Inventory Core & Ingestion Engine',
    subtitle: 'High-speed ingestion and normalization coexisting with your operational DMS',
    icon: '⚡',
    capabilities: [
      {
        name: 'DMS Feed & Export Coexistence',
        description: 'Automated CSV, XML, and REST API intake from CDK, Reynolds & Reynolds, Dealertrack, Frazer, and DealerCenter. The DMS retains accounting and flooring authority.',
        evidenceOrStatus: 'Non-disruptive',
      },
      {
        name: '17-Character VIN Decoding',
        description: 'ISO-3779 checksum calculation, automated engine/trim decoding, standard equipment expansion, and NHTSA safety recall checks.',
        evidenceOrStatus: 'ISO Certified',
      },
      {
        name: 'Automotive Shot Grid & Media Taxonomy',
        description: 'Enforces required slot standards: Front 3/4, Rear 3/4, Cockpit, Odometer, Bed/Cargo, and Window Sticker with 1920x1080 baseline verification.',
        evidenceOrStatus: 'Slot Enforced',
      },
      {
        name: 'Batch Pricing & Stock Collision Prevention',
        description: 'Absolute pricing batch updates and immutable stock number mapping to avoid cross-feed unit collisions across multiple rooftops.',
        evidenceOrStatus: 'Zero Overwrite',
      },
    ],
  },
  {
    id: 'preflight-syndication',
    pillarNumber: '02',
    title: 'Pre-Flight Engine & 31-Channel Syndication',
    subtitle: 'Validates inventory rules before pushing feeds to eliminate silent downstream rejections',
    icon: '🚀',
    capabilities: [
      {
        name: 'Pre-Flight Schema Validation',
        description: 'Evaluates each vehicle against destination-specific requirements (EPA MPG for Google, 16:9 crops for Meta, trim codes for eBay) before compilation.',
        evidenceOrStatus: 'Pre-Push Gate',
      },
      {
        name: 'Direct Catalog API Bridges',
        description: 'Continuous catalog sync via REST APIs for Google Vehicle Ads, Meta AIA, TikTok Shop, Microsoft Auto, and Pinterest Shopping.',
        evidenceOrStatus: '<15m Latency',
      },
      {
        name: 'Auto-Sync & Staggered Dispatch',
        description: 'Configurable Autopilot engine synchronizes active lot updates with external endpoints on optimal refresh intervals without API rate-limit errors.',
        evidenceOrStatus: 'Automated',
      },
      {
        name: 'Syndication Sentry & Feed Health',
        description: 'Audits every outbound submission attempt, logs transmission status, detects third-party parser errors, and flags actionable corrections.',
        evidenceOrStatus: 'Live Telemetry',
      },
    ],
  },
  {
    id: 'consumer-marketplace',
    pillarNumber: '03',
    title: 'First-Party Consumer Marketplace',
    subtitle: 'Nationwide consumer portal providing direct reach with zero syndication lag and zero conquest ads',
    icon: '🌐',
    capabilities: [
      {
        name: 'Zero-Lag Instant Distribution',
        description: 'Ready vehicles are immediately searchable by consumers without waiting for overnight batch processing or third-party queue approval.',
        evidenceOrStatus: '0-Min Delay',
      },
      {
        name: 'Zero Competitor Conquest Ads',
        description: 'Unlike commercial automotive portals, your Vehicle Detail Pages (VDPs) never feature competitor inventory, pop-up ads, or alternative dealer banners.',
        evidenceOrStatus: '100% Protected',
      },
      {
        name: 'Direct Zero-Commission Lead Intake',
        description: 'Consumer inquiries, test drive requests, and trade-in submissions transmit directly to your dealership without third-party lead-brokering fees.',
        evidenceOrStatus: '$0 Lead Fee',
      },
      {
        name: 'Verified Dealership Identity',
        description: 'Official dealership profiles, transparent Monroney equipment details, high-resolution media galleries, and direct phone/map actions.',
        evidenceOrStatus: 'Verified Rooftop',
      },
    ],
  },
  {
    id: 'lead-ingress',
    pillarNumber: '04',
    title: 'Inquiry Ingress & Direct CRM Dispatch',
    subtitle: 'Standardized ADF/XML lead routing with instant multi-channel staff notifications',
    icon: '📥',
    capabilities: [
      {
        name: 'Industry-Standard ADF/XML Routing',
        description: 'Inbound inquiries format to Auto-lead Data Format (ADF) 1.0 XML and deliver via SMTP/Webhook directly into CDK, Reynolds, DealerSocket, or Elead.',
        evidenceOrStatus: 'ADF 1.0 Compliant',
      },
      {
        name: 'Mail Server Acceptance Verification',
        description: 'Tracks network transmission and recipient mail server handshakes so dealership managers know when a lead safely entered their CRM.',
        evidenceOrStatus: 'SMTP Audited',
      },
      {
        name: 'Instant Staff Notifications',
        description: 'Real-time alert dispatch to sales managers and BDC teams via Webhooks, Email, SMS, Discord, and Telegram channels with lead summaries.',
        evidenceOrStatus: '<10s Dispatch',
      },
      {
        name: 'Automated Buyer Engagement Engine',
        description: 'Configurable automated responses with dealership branding, confirmed vehicle availability, and instant showroom scheduling links.',
        evidenceOrStatus: 'Immediate',
      },
    ],
  },
  {
    id: 'attribution-velocity',
    pillarNumber: '05',
    title: 'Sales Attribution & Turn Velocity Intelligence',
    subtitle: 'Deterministic revenue links and statistically gated turn analytics',
    icon: '📊',
    capabilities: [
      {
        name: 'Deterministic Sales-to-Lead Attribution',
        description: 'When a vehicle transitions to sold, the attribution engine matches its VIN and customer contact back to originating platform inquiries.',
        evidenceOrStatus: 'Deterministic',
      },
      {
        name: '4-Tier Evidence Hierarchy',
        description: 'Every metric is explicitly tagged as [Observed], [Reported], [Attributed], or [Estimated]—preventing ad vendor inflated claim deception.',
        evidenceOrStatus: 'Audited Truth',
      },
      {
        name: 'Statistically Gated Demand Intelligence',
        description: 'Turn velocity analytics across body styles, price tiers, and color families require a minimum sample size (N ≥ 5) before displaying recommendations.',
        evidenceOrStatus: 'N ≥ 5 Gated',
      },
      {
        name: 'Aging Brackets & Repricing Engine',
        description: 'Tracks vehicle turns across 0-15d, 16-30d, 31-60d, and 60d+ brackets with data-backed repricing recommendations before lot depreciation hits.',
        evidenceOrStatus: 'Margin Shield',
      },
    ],
  },
];
