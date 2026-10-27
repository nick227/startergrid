import type { PrismaClient } from '@prisma/client';
import { listPlatformAccounts, type PlatformAccountDetail } from '../publishing/platformAccountService.js';
import type { ConnectionField } from '../../lib/types.js';

/**
 * Plain-language setup plan for one channel: at most four short steps, each owned by exactly
 * one party, and one current step. Built from recorded account state, so the UI only renders
 * it; there are no developer instructions to translate. "Set up" never means listings are
 * live; publication is verified separately.
 */

export type SetupOwner = 'DEALERSHIP' | 'INTERNAL_SUPPORT' | 'PARTNER';
export type SetupStepState = 'DONE' | 'TODO' | 'WAITING' | 'BLOCKED';
export type SetupActionKind = 'CONNECT_ACCOUNT' | 'ENTER_DETAILS' | 'OPEN_PROVIDER_SITE' | 'CONTACT_SUPPORT' | 'NONE';
/** READY: nothing left. NEEDS_YOU: the dealership's turn. WAITING: StarterGrid or the provider's turn. BLOCKED: stuck on StarterGrid. */
export type SetupPlanStatus = 'READY' | 'NEEDS_YOU' | 'WAITING' | 'BLOCKED';

export type SetupField = {
  key: string;
  label: string;
  hint: string | null;
  placeholder: string | null;
  /** Regex the value must match, when the provider has a known format. */
  pattern: string | null;
  validationHint: string | null;
  /** Where the PATCH /accounts/:slug body takes it: a top-level key or inside connectionConfig. */
  saveAs: 'accountId' | 'connectionConfig';
  filled: boolean;
};

export type SetupStep = {
  id: string;
  title: string;
  instruction: string;
  owner: SetupOwner;
  state: SetupStepState;
  action: {
    kind: SetupActionKind;
    label: string | null;
    url: string | null;
    fields: SetupField[];
    /**
     * For steps StarterGrid cannot observe (applying, opening an account): one button that
     * sends `patch` to PATCH /accounts/:slug. Self-reported; it never marks a channel ready.
     */
    markDone: { label: string; patch: { state: 'PENDING_REVIEW' | 'ACTIVE' } } | null;
  };
};

export type ChannelSetupPlan = {
  channel: string;
  name: string;
  status: SetupPlanStatus;
  /** One sentence saying where setup stands and what happens next. */
  headline: string;
  currentStepId: string | null;
  progress: { done: number; total: number };
  /** Set when StarterGrid cannot post to this channel at all; the dealership posts there itself. */
  postingNote: string | null;
  /** Provider's own estimate from its signup terms, shown as-is; StarterGrid does not track it. */
  providerEstimate: string | null;
  steps: SetupStep[];
};

const READY_STATES = new Set(['ACTIVE', 'READY']);
const PROVIDER_REVIEW_STATES = new Set(['PENDING_REVIEW', 'WAITING_ON_PARTNER', 'PARTNER_REQUIRED']);
const SUPPORT_STATES = new Set(['BLOCKED', 'SUSPENDED']);
// Rep contact details are optional extras, never a setup requirement.
const OPTIONAL_FIELDS = new Set(['platformRepName', 'platformRepEmail', 'membershipStatus']);
// Same split the dealer UI used: secrets and file-transfer details go through StarterGrid support.
// Plain "username" is not technical: a seller username is something the dealer knows.
const TECHNICAL_RE = /\b(sftp|ftp|feed url|feed file|endpoint|whitelist|ip address|api keys?|host|port|homenet|password|tokens?|secrets?)\b/i;

export function isTechnicalField(f: Pick<ConnectionField, 'field' | 'label' | 'isSecret'>): boolean {
  return Boolean(f.isSecret) || TECHNICAL_RE.test(`${f.field} ${f.label}`);
}

function fieldValue(account: PlatformAccountDetail, key: string): unknown {
  if (key === 'accountId') return account.accountId;
  return account.connectionConfig?.[key];
}
const isFilled = (v: unknown) => typeof v === 'string' ? v.trim().length > 0 : v !== null && v !== undefined;

function toField(account: PlatformAccountDetail, f: ConnectionField): SetupField {
  return {
    key: f.field, label: f.label, hint: f.hint ?? null, placeholder: f.placeholder ?? null,
    pattern: f.pattern ?? null, validationHint: f.validationHint ?? null,
    saveAs: f.field === 'accountId' ? 'accountId' : 'connectionConfig',
    filled: isFilled(fieldValue(account, f.field)),
  };
}

const step = (s: Omit<SetupStep, 'action'> & { action?: Partial<SetupStep['action']> }): SetupStep => ({
  ...s,
  action: { kind: 'NONE', label: null, url: null, fields: [], markDone: null, ...s.action },
});

const ADF_SLUG = 'adf-xml-lead-routing';
const EMAIL_PATTERN = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
const OAUTH_BRANDS: Record<string, string> = {
  'facebook-business-page': 'Facebook', 'meta-catalog-ads': 'Facebook', google: 'Google', 'google-business-profile': 'Google',
  microsoft: 'Microsoft', ebay: 'eBay', tiktok: 'TikTok', 'tiktok-shop': 'TikTok', apple: 'Apple', pinterest: 'Pinterest',
  reddit: 'Reddit', snapchat: 'Snapchat', x: 'X', nextdoor: 'Nextdoor', shopify: 'Shopify',
};
const NAME_SUFFIX = /\s+(Dealer Marketplace|Dealer Network|Dealer Solutions|for Dealers|for Artists|for Authors|Seller Catalog|Seller Hub|Seller Portal|Seller|Product Catalog|Creator Studio|Creator Portal|Artist Shop|Partner Center|Ads API)$/i;

/** "CarGurus Dealer Marketplace" → "CarGurus", "Cars.com / Cars Commerce" → "Cars.com". */
export function brandName(name: string): string {
  return name.split(' / ')[0]!.split(' (')[0]!.replace(NAME_SUFFIX, '').trim() || name;
}
const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

/** Steps after the first unfinished one wait on it, so only one step ever asks for action. */
function sequence(steps: SetupStep[]): SetupStep[] {
  let blocked = false;
  return steps.map(s => {
    if (blocked && s.state !== 'DONE') return { ...s, state: 'WAITING' as const };
    if (s.state !== 'DONE') blocked = true;
    return s;
  });
}

export function buildSetupPlan(account: PlatformAccountDetail): ChannelSetupPlan {
  const name = account.platformName;
  const ready = READY_STATES.has(account.state);
  const fields = account.connectionFields ?? [];
  const dealerFields = fields.filter(f => !isTechnicalField(f) && !OPTIONAL_FIELDS.has(f.field)).map(f => toField(account, f));
  const technicalFields = fields.filter(f => isTechnicalField(f)).map(f => toField(account, f));
  const dealerDetailsDone = dealerFields.length > 0 && dealerFields.every(f => f.filled);
  const signupUrl = account.partnerSignup?.applyUrl ?? account.integrationUrls?.partnerPortalUrl ?? null;
  const steps: SetupStep[] = [];

  if (account.integrationClass === 'OWNED' && account.connectionType !== 'OAUTH') {
    return finish(account, []);
  }
  if (account.platformSlug === ADF_SLUG) return finish(account, crmSteps(account));
  const brand = brandName(name);
  const manual = account.connectionType === 'MANUAL_PORTAL';

  // A channel StarterGrid itself has not finished turning on comes before anything else.
  if (!account.systemSetupReady && account.connectionType !== 'NONE' && account.integrationClass !== 'OWNED') {
    steps.push(step({ id: 'startergrid-enable', title: `StarterGrid turns on ${brand}`,
      instruction: `StarterGrid is still setting up ${brand}. Nothing for you to do yet.`,
      owner: 'INTERNAL_SUPPORT', state: 'BLOCKED',
      action: { kind: 'CONTACT_SUPPORT', label: 'Ask support' } }));
  }
  if (SUPPORT_STATES.has(account.state)) {
    steps.push(step({ id: 'support-fix', title: 'Support fixes the account',
      instruction: `Your ${brand} account is on hold. StarterGrid support will sort it out with ${brand}.`,
      owner: 'INTERNAL_SUPPORT', state: 'BLOCKED',
      action: { kind: 'CONTACT_SUPPORT', label: 'Ask support' } }));
  }

  if (account.connectionType === 'OAUTH') {
    const provider = OAUTH_BRANDS[account.oauthProvider ?? ''] ?? brand;
    steps.push(step({ id: 'sign-in', title: `Sign in to ${provider}`,
      instruction: account.oauthExpired
        ? `Your ${provider} sign-in expired. Sign in again to reconnect.`
        : `Sign in with your ${provider} business account and allow StarterGrid.`,
      owner: 'DEALERSHIP', state: account.oauthConnected ? 'DONE' : 'TODO',
      action: { kind: 'CONNECT_ACCOUNT', label: account.oauthExpired ? 'Sign in again' : `Sign in to ${provider}` } }));
  } else if (account.connectionType !== 'NONE') {
    steps.push(step({ id: 'get-account', title: `Get ${article(brand)} ${brand} account`,
      instruction: account.partnerSignup?.contactType === 'rep-assisted'
        ? `Ask ${brand} for a dealer account. Tell them you list with StarterGrid.`
        : `Sign up for ${article(brand)} ${brand} business account.`,
      owner: 'DEALERSHIP',
      state: dealerDetailsDone || account.state !== 'ACCOUNT_NEEDED' ? 'DONE' : 'TODO',
      action: {
        kind: signupUrl ? 'OPEN_PROVIDER_SITE' : 'NONE', label: signupUrl ? `Go to ${brand}` : null, url: signupUrl,
        markDone: manual
          ? { label: 'I have an account', patch: { state: 'ACTIVE' } }
          : { label: account.partnerSignup?.contactType === 'rep-assisted' ? 'I asked them' : 'I signed up', patch: { state: 'PENDING_REVIEW' } },
      } }));
  }

  if (dealerFields.length > 0) {
    const labels = dealerFields.map(f => f.label).join(' and ');
    const rejected = account.state === 'FAILED';
    steps.push(step({ id: 'enter-details', title: `Enter your ${labels}`,
      instruction: rejected
        ? `${brand} did not accept these details. Check them and save again.`
        : labels.toLowerCase().includes(brand.split(' ')[0]!.toLowerCase()) ? `When you have your ${labels}, paste it here.` : `When you have your ${labels} from ${brand}, paste it here.`,
      owner: 'DEALERSHIP', state: dealerDetailsDone && !rejected ? 'DONE' : 'TODO',
      action: { kind: 'ENTER_DETAILS', label: 'Save', fields: dealerFields } }));
  }

  // Sign-in channels get their tokens from the sign-in; only feed channels need support to enter details.
  if (technicalFields.length > 0 && account.connectionType !== 'OAUTH') {
    const done = technicalFields.every(f => f.filled) || ready;
    steps.push(step({ id: 'support-connect', title: 'StarterGrid connects the feed',
      instruction: `When ${brand} emails you file-transfer details, forward that email to StarterGrid support. Support enters them for you.`,
      owner: 'INTERNAL_SUPPORT', state: done ? 'DONE' : 'TODO',
      action: { kind: 'CONTACT_SUPPORT', label: 'Send to support' } }));
  }

  if (account.connectionType !== 'OAUTH' && account.connectionType !== 'NONE' && !manual) {
    const needsInfo = account.state === 'NEEDS_INFO';
    steps.push(step({ id: 'provider-approval', title: `${brand} approves you`,
      instruction: needsInfo
        ? `${brand} asked for more information. Check your email from ${brand} and reply to them.`
        : `${brand} reviews your account. They contact you if they need anything.`,
      owner: needsInfo ? 'DEALERSHIP' : 'PARTNER',
      state: ready ? 'DONE' : needsInfo ? 'TODO' : PROVIDER_REVIEW_STATES.has(account.state) ? 'WAITING' : 'TODO',
      action: needsInfo && signupUrl ? { kind: 'OPEN_PROVIDER_SITE', label: `Go to ${brand}`, url: signupUrl } : {} }));
  } else if (account.connectionType === 'OAUTH') {
    steps.push(step({ id: 'check-connection', title: 'StarterGrid checks the connection',
      instruction: account.state === 'FAILED'
        ? `The connection check failed. StarterGrid support will look into it.`
        : `StarterGrid confirms it can reach your ${brand} account.`,
      owner: 'INTERNAL_SUPPORT', state: ready ? 'DONE' : account.state === 'FAILED' ? 'BLOCKED' : 'TODO',
      action: account.state === 'FAILED' ? { kind: 'CONTACT_SUPPORT', label: 'Ask support' } : {} }));
  }

  // A provider asking the dealer for information is the most urgent thing; surface it first.
  const followUp = steps.findIndex(x => x.id === 'provider-approval' && x.owner === 'DEALERSHIP' && x.state === 'TODO');
  const support = steps.findIndex(x => x.id === 'support-connect');
  if (followUp > -1 && support > -1 && support < followUp) steps.splice(support, 0, ...steps.splice(followUp, 1));

  return finish(account, sequence(steps), manual ? `StarterGrid can't post to ${brand} for you. You post listings there yourself.` : null);
}

/** CRM lead delivery: the one thing to set is the CRM's ADF lead email (see sendLeadToCrm). */
function crmSteps(account: PlatformAccountDetail): SetupStep[] {
  const value = account.accountId?.trim() ?? '';
  const valid = new RegExp(EMAIL_PATTERN).test(value);
  return [step({ id: 'crm-email', title: 'Add your CRM lead email',
    instruction: value && !valid
      ? 'StarterGrid can only send leads to an email address. Ask your CRM provider for its ADF lead email.'
      : 'Ask your CRM provider for the email address that receives ADF leads, then paste it here.',
    owner: 'DEALERSHIP', state: valid ? 'DONE' : 'TODO',
    action: { kind: 'ENTER_DETAILS', label: 'Save', fields: [{
      key: 'accountId', label: 'CRM lead email', hint: 'Your CRM provider gives you this address for ADF/XML leads.',
      placeholder: 'leads@yourcrm.com', pattern: EMAIL_PATTERN, validationHint: 'Enter an email address.',
      saveAs: 'accountId', filled: valid,
    }] } })];
}

function finish(account: PlatformAccountDetail, steps: SetupStep[], postingNote: string | null = null): ChannelSetupPlan {
  const name = account.platformSlug === ADF_SLUG ? 'CRM lead delivery' : brandName(account.platformName);
  const current = steps.find(s => s.state !== 'DONE') ?? null;
  const status: SetupPlanStatus = !current
    ? 'READY'
    : current.state === 'BLOCKED'
      ? 'BLOCKED'
      : current.owner === 'DEALERSHIP' ? 'NEEDS_YOU' : 'WAITING';
  const headline =
    status === 'READY' ? `${name} is set up.`
    : status === 'NEEDS_YOU' ? `Next: ${current!.title.charAt(0).toLowerCase()}${current!.title.slice(1)}.`
    : status === 'BLOCKED' ? `StarterGrid support is working on ${name}. Nothing for you to do right now.`
    : current!.owner === 'PARTNER' ? `Waiting for ${name}. Nothing for you to do right now.`
    : `StarterGrid support is on it. Nothing for you to do right now.`;
  return {
    channel: account.platformSlug,
    name,
    status,
    headline,
    currentStepId: current?.id ?? null,
    progress: { done: steps.filter(s => s.state === 'DONE').length, total: steps.length },
    postingNote,
    providerEstimate: account.partnerSignup?.estimatedDays ?? null,
    steps,
  };
}

/** Plans for the channels the dealership turned on, or for one channel by slug. */
export async function getChannelSetupPlans(db: PrismaClient, dealershipId: string, channel?: string): Promise<ChannelSetupPlan[]> {
  const { accounts } = await listPlatformAccounts(db, dealershipId);
  return accounts
    .filter(a => a.siteEnabled !== false && (channel ? a.platformSlug === channel : a.dealerEnabled))
    .map(buildSetupPlan);
}
