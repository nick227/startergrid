import type {
  ApplicationStatus,
  DealerStatusCopy,
  DealerStatusLabel,
  IntegrationClass,
  PlatformProfileSeed
} from '../lib/types.js';

const REVIEW_TIMES: Partial<Record<string, string>> = {
  'cargurus-dealer': '3–5 business days',
  'autotrader-cox': '2–3 business days',
  'cars-com': '5–7 business days',
  'truecar-dealer-network': '5–7 business days',
  'google-vehicle-ads': '1–3 business days',
  'meta-automotive-ads': '1–3 business days',
  'tiktok-automotive-ads': '1–2 business days',
  'microsoft-automotive-ads': '1–2 business days',
  'linkedin-lead-gen-forms': '1–2 business days',
  'apple-business-connect': '3–5 business days'
};

function statusLabel(status: ApplicationStatus, integrationClass: IntegrationClass): DealerStatusLabel {
  switch (status) {
    case 'NOT_STARTED':
      return integrationClass === 'PARTNER_DEPENDENT' ? 'partner_required' : 'not_started';
    case 'PROFILE_MISSING_INFO': return 'profile_incomplete';
    case 'READY_TO_SUBMIT': return 'ready_to_submit';
    case 'SUBMITTED': return 'submitted';
    case 'PLATFORM_REVIEWING': return 'reviewing';
    case 'DEALER_ACTION_NEEDED': return 'needs_action';
    case 'APPROVED': return 'approved';
    case 'FEED_TESTING': return 'feed_testing';
    case 'ACTIVE': return 'active';
    case 'REJECTED': return 'rejected';
    case 'PAUSED': return 'paused';
  }
}

function headline(label: DealerStatusLabel, platform: PlatformProfileSeed): string {
  const name = platform.name;
  switch (label) {
    case 'active': return `Active on ${name}`;
    case 'needs_action': return `Action needed — ${name}`;
    case 'reviewing': return `Under review by ${name}`;
    case 'partner_required': return `Partner agreement required — ${name}`;
    case 'not_started': return `Ready to launch on ${name}`;
    case 'ready_to_submit': return `Ready to submit to ${name}`;
    case 'submitted': return `Submitted to ${name}`;
    case 'approved': return `Approved by ${name}`;
    case 'feed_testing': return `Feed setup in progress — ${name}`;
    case 'rejected': return `Not accepted by ${name}`;
    case 'paused': return `Paused on ${name}`;
    case 'profile_incomplete': return `Profile incomplete for ${name}`;
  }
}

function detail(
  label: DealerStatusLabel,
  platform: PlatformProfileSeed,
  dealerAction: string | null | undefined
): string {
  const reviewTime = REVIEW_TIMES[platform.slug] ?? '2–5 business days';
  switch (label) {
    case 'active':
      return platform.integrationClass === 'OWNED'
        ? 'Your inventory page is live and accepting leads directly.'
        : `Your vehicles are live and visible to shoppers on ${platform.name}.`;
    case 'needs_action':
      return dealerAction ?? 'Review the outstanding requirement and resubmit.';
    case 'reviewing':
      return `${platform.name} is reviewing your application. This typically takes ${reviewTime}.`;
    case 'partner_required':
      return `${platform.name} requires a commercial agreement before dealer onboarding can proceed. Contact the platform or your account manager to initiate.`;
    case 'not_started':
      return platform.integrationClass === 'FEEDABLE'
        ? 'Your profile meets all requirements. Submit your feed to get listed.'
        : `Your profile is ready. Start the onboarding process to get listed on ${platform.name}.`;
    case 'ready_to_submit':
      return 'All requirements are met. Submit to begin the onboarding process.';
    case 'submitted':
      return `Your application has been sent to ${platform.name}. Awaiting their response.`;
    case 'approved':
      return `${platform.name} approved your application. Feed or account setup is in progress.`;
    case 'feed_testing':
      return `Your inventory feed is being validated by ${platform.name}. Listings will go live once testing passes.`;
    case 'rejected':
      return dealerAction ?? `${platform.name} was unable to accept this application. See what needs to change.`;
    case 'paused':
      return `Your listings on ${platform.name} are temporarily paused. Reactivate when ready.`;
    case 'profile_incomplete':
      return 'Complete your dealer profile to unlock this channel. Missing required fields are listed below.';
  }
}

function cta(label: DealerStatusLabel, integrationClass: IntegrationClass): string | null {
  switch (label) {
    case 'active': return null;
    case 'needs_action': return 'View required action';
    case 'reviewing': return null;
    case 'partner_required': return 'Learn about partner onboarding';
    case 'not_started': return integrationClass === 'OWNED' ? 'Activate storefront' : 'Start onboarding';
    case 'ready_to_submit': return 'Submit now';
    case 'submitted': return null;
    case 'approved': return 'Complete setup';
    case 'feed_testing': return 'View feed status';
    case 'rejected': return 'See what needs to change';
    case 'paused': return 'Resume listings';
    case 'profile_incomplete': return 'Complete profile';
  }
}

export function getDealerStatusCopy(
  platform: PlatformProfileSeed,
  status: ApplicationStatus,
  dealerAction?: string | null
): DealerStatusCopy {
  const label = statusLabel(status, platform.integrationClass);
  return {
    platformSlug: platform.slug,
    platformName: platform.name,
    integrationClass: platform.integrationClass,
    statusLabel: label,
    headline: headline(label, platform),
    detail: detail(label, platform, dealerAction),
    cta: cta(label, platform.integrationClass)
  };
}

export function getDealerStatusBadge(label: DealerStatusLabel): string {
  switch (label) {
    case 'active': return '🟢 Active';
    case 'needs_action': return '🟡 Needs action';
    case 'reviewing': return '🔵 Under review';
    case 'partner_required': return '⚪ Partner required';
    case 'not_started': return '⚪ Not started';
    case 'ready_to_submit': return '🔵 Ready to submit';
    case 'submitted': return '🔵 Submitted';
    case 'approved': return '🟢 Approved';
    case 'feed_testing': return '🔵 Feed testing';
    case 'rejected': return '🔴 Not accepted';
    case 'paused': return '🟡 Paused';
    case 'profile_incomplete': return '🟡 Profile incomplete';
  }
}

export function integrationClassLabel(cls: IntegrationClass): string {
  switch (cls) {
    case 'OWNED': return 'Owned channel';
    case 'FEEDABLE': return 'Self-serve feed';
    case 'ASSISTED': return 'Assisted onboarding';
    case 'PARTNER_DEPENDENT': return 'Partner agreement required';
  }
}
