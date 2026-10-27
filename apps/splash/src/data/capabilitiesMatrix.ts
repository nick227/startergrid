export interface CapabilityItem {
  name: string;
  description: string;
  docTitle: string;
  docRef: string;
}

export interface CapabilityArea {
  id: string;
  title: string;
  summary: string;
  items: CapabilityItem[];
}

export const CAPABILITIES_AREAS: CapabilityArea[] = [
  {
    id: 'inventory-management',
    title: 'Inventory Management & Intake',
    summary: 'Manage physical lot inventory directly or sync records from your DMS without disrupting in-store accounting.',
    items: [
      {
        name: 'DMS Coexistence & Source of Truth',
        description: 'StarterGrid distributes public listing copy while your DMS retains ownership of floorplanning, accounting, and deal jackets.',
        docTitle: 'How the DMS relates to StarterGrid',
        docRef: 'doc:industry/dms-source-of-truth',
      },
      {
        name: 'Spreadsheet & CSV Batch Import',
        description: 'Import lot inventory in batches via formatted CSV with stock number collision protection and review workflows.',
        docTitle: 'Import a spreadsheet',
        docRef: 'doc:inventory/csv-import',
      },
      {
        name: 'Pre-Flight Readiness & Gating',
        description: 'Distinguish between Ready to send, Needs details, and Cannot list before submitting records to destinations.',
        docTitle: 'When a vehicle can be listed',
        docRef: 'doc:inventory/inventory-readiness',
      },
      {
        name: 'Multi-Field Absolute Bulk Editing',
        description: 'Apply absolute pricing and field updates across filtered vehicle sets without unintended overwrites.',
        docTitle: 'Bulk edit',
        docRef: 'doc:inventory/bulk-edit',
      },
    ],
  },
  {
    id: 'channel-distribution',
    title: 'Channel Distribution & Publishing',
    summary: 'Configure destinations, enforce pre-flight rules, and monitor actual delivery outcomes.',
    items: [
      {
        name: 'Channel Setup & Permissions',
        description: 'Connect destinations, follow clear onboarding steps, and separate account access from publishing permissions.',
        docTitle: 'Connect a marketplace or advertising site',
        docRef: 'doc:app/channels',
      },
      {
        name: 'Autopilot Automatic Synchronization',
        description: 'Schedule automated catalog synchronization and configure pausing rules when inventory undergoes lot review.',
        docTitle: 'Automatic updates and pausing',
        docRef: 'doc:processes/auto-sync',
      },
      {
        name: 'Connection vs. Live Verification',
        description: 'Understand the critical difference between account credentials, submitted payloads, and verified live listings.',
        docTitle: 'Why a website has not updated',
        docRef: 'doc:app/sync-vs-accounts',
      },
      {
        name: 'Syndication Lag & Push Frequency',
        description: 'Review refresh intervals across real-time catalog APIs, hourly pushes, and third-party batch polling feeds.',
        docTitle: 'Syndication lag and refresh schedules',
        docRef: 'doc:industry/syndication-lag',
      },
    ],
  },
  {
    id: 'inquiries-crm',
    title: 'Buyer Inquiries & CRM Delivery',
    summary: 'Consolidate leads across all connected channels and route them reliably into your existing dealership CRM.',
    items: [
      {
        name: 'ADF/XML Lead Dispatch',
        description: 'Format inbound buyer inquiries into industry-standard Auto-lead Data Format 1.0 XML over direct SMTP or webhook.',
        docTitle: 'Why did my lead not reach my CRM?',
        docRef: 'doc:crm-delivery',
      },
      {
        name: 'Mail-Server Receipt Verification',
        description: 'Inspect SMTP 250 OK handshake confirmations to verify the receiving CRM server accepted the inquiry payload.',
        docTitle: 'Confirming CRM receipt',
        docRef: 'doc:crm-delivery',
      },
      {
        name: 'Shared Follow-Up Statuses',
        description: 'Track dealership follow-up across shared team statuses (New, Contacted, Appointment, Closed, Lost).',
        docTitle: 'Lead statuses and CRM handoff',
        docRef: 'doc:app/lead-status',
      },
      {
        name: 'Multi-Method Staff Notifications',
        description: 'Configure real-time delivery alerts via Webhooks, Email, Discord, Telegram, SMS, and buyer auto-response.',
        docTitle: 'How you hear about new inquiries',
        docRef: 'doc:connections/lead-notifications',
      },
    ],
  },
  {
    id: 'performance-intelligence',
    title: 'Performance & Demand Intelligence',
    summary: 'Measure real customer acquisition costs and analyze vehicle turn velocity with statistical confidence gating.',
    items: [
      {
        name: 'Operational Reports & Metrics',
        description: 'Inspect movement, readiness, observed demand, merchandising, throughput, exposure, and engagement reports.',
        docTitle: 'Find and read reports',
        docRef: 'doc:app/reports',
      },
      {
        name: 'Inventory Aging & Price Guidance',
        description: 'Review inventory age brackets (0-15d, 16-30d, 31-60d, 60d+) with suggested pricing adjustments based on turn history.',
        docTitle: 'Review older inventory',
        docRef: 'doc:inventory/older-inventory',
      },
      {
        name: 'Statistical Confidence Gating',
        description: 'Demand observations require a minimum sample threshold (N ≥ 5) before reporting velocity conclusions.',
        docTitle: 'Statistical gating standards',
        docRef: 'doc:app/reports',
      },
      {
        name: 'Deterministic Sales Attribution',
        description: 'Link confirmed vehicle sales back to originating marketing channels when marked sold in your inventory.',
        docTitle: 'Deterministic lead-to-VIN attribution',
        docRef: 'doc:app/reports',
      },
    ],
  },
  {
    id: 'team-governance',
    title: 'Team Access & Dealership Operations',
    summary: 'Secure dealership operations with scoped access, multi-rooftop management, and operational audit logging.',
    items: [
      {
        name: 'Team Access & Role Boundaries',
        description: 'Invite dealership staff with distinct permissions separating inventory management, channel setup, and administrative review.',
        docTitle: 'Invitations and sign-in',
        docRef: 'doc:app/team-access',
      },
      {
        name: 'Multi-Rooftop Group Oversight',
        description: 'Manage multiple dealership locations from a single operator account with shared credential registries.',
        docTitle: 'Dealership setup and handoff',
        docRef: 'doc:staff-dealership-assistance',
      },
      {
        name: 'Operational Audit Logging',
        description: 'Maintain a complete historical record of inventory changes, pricing updates, channel syncs, and delivery attempts.',
        docTitle: 'Documentation and audit records',
        docRef: 'doc:documentation-records',
      },
    ],
  },
];
