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
    title: 'Sales Channels & Publishing',
    summary: 'Connect sales channels, enforce listing quality checks, and monitor vehicle publishing status.',
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
    title: 'Performance & Sales Results',
    summary: 'Compare marketing spend against recorded buyer inquiries and actual car sales, backed by clear evidence badges.',
    items: [
      {
        name: 'Channel Performance Reports',
        description: 'Review buyer inquiries, marketing costs, and available sales outcomes side-by-side for each connected channel.',
        docTitle: 'Find and read reports',
        docRef: 'doc:app/reports',
      },
      {
        name: 'Days on Lot & Pricing Guidance',
        description: 'Review vehicle age brackets (0-15d, 16-30d, 31-60d, 60d+) to identify slow-moving cars and adjust prices before holding costs build up.',
        docTitle: 'Review older inventory',
        docRef: 'doc:inventory/older-inventory',
      },
      {
        name: 'Minimum Sample Thresholds (N ≥ 5)',
        description: 'Demand and turn observations require at least 5 units before reporting recommendations, avoiding misleading conclusions from small sample sizes.',
        docTitle: 'Statistical standards',
        docRef: 'doc:app/reports',
      },
      {
        name: 'Sales Tracking by Channel',
        description: 'Connect confirmed vehicle sales to the channel that brought in the buyer, using verified lead records or dealership sales desk confirmations.',
        docTitle: 'Tracking sales and channel performance',
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
