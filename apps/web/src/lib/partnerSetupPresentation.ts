const TECHNICAL_RE =
  /\b(sftp|ftp|xml|json feed|feed url|feed file|feed endpoint|whitelist|ip address|api keys?|host\b|port\b|credentials?|ingestion|homenet|username|password|tokens?|secrets?)\b/i;

export function isTechnicalText(text: string): boolean {
  return TECHNICAL_RE.test(text);
}

export function isTechnicalField(field: { field: string; label: string; isSecret?: boolean }): boolean {
  return !!field.isSecret || isTechnicalText(`${field.field} ${field.label}`);
}

const STEP_RULES: Array<{ test: (s: string) => boolean; text: string }> = [
  {
    test: s => /(sftp|ftp|homenet).*(enter|credential|username|password)/.test(s) || /enter.*(sftp|ftp|credential|username|password|homenet)/.test(s),
    text: 'Ask DealerGrid support to enter the file-transfer details they gave you.',
  },
  {
    test: s => s.includes('whitelist') || (s.includes('ip') && (s.includes('provider') || s.includes('allow'))),
    text: 'They may need to allow DealerGrid. Support handles that with them.',
  },
  {
    test: s => /(provides?|provided).*(feed|credential)/.test(s) || /feed (endpoint|url|credential)/.test(s),
    text: 'After they approve your account, they send the details needed to start listing.',
  },
  {
    test: s => /(contact|request|ask)/.test(s) && /(rep|ingestion|sftp|feed|homenet)/.test(s),
    text: 'Ask your contact there to turn on inventory updates for your store.',
  },
  {
    test: s => /save.*(validat|credential|test|check)/.test(s),
    text: 'Save the details, then use Check connection.',
  },
  {
    test: s => /confirm.*(feed|listing|live|accepted)/.test(s),
    text: 'Ask them to confirm they received your listings. Connected does not mean they already show them.',
  },
  {
    test: s => /confirm.*(account|dealer center|active)/.test(s) || /must have/.test(s),
    text: 'Make sure your dealer account with them is active.',
  },
  {
    test: s => /applies? for/.test(s) || /sign.?up/.test(s),
    text: 'Apply for a dealer account on their website if you do not have one.',
  },
  {
    test: s => /opens?.{0,60}(platform page|portal)/.test(s) && /click/.test(s),
    text: 'On this page, use Connect and sign in with their website.',
  },
  {
    test: s => /clicks? connect|connect with/.test(s) || /oauth flow/.test(s),
    text: 'On this page, use Connect and sign in with their website.',
  },
  {
    test: s => /opens?.{0,60}(platform page|portal)/.test(s),
    text: 'Open this destination.',
  },
  {
    test: s => /authoriz|grants? the requested|signs? in to their/.test(s),
    text: 'Sign in and allow DealerGrid to send listings for your store.',
  },
  {
    test: s => /returns? to the portal|token is stored|connection is confirmed/.test(s),
    text: 'After you sign in, come back here. The connection is saved.',
  },
  {
    test: s => /token.*refresh|reconnect.*revok|manual reconnect/.test(s),
    text: 'If they disconnect you, sign in again.',
  },
  {
    test: s => /(operator|enter).*(credential|token|key|endpoint)/.test(s) || /enter.*(portal|settings)/.test(s),
    text: 'Ask DealerGrid support to enter the details they gave you.',
  },
  {
    test: s => /(system|we).*(generat|deliver|push|send).*(feed|listing|catalog|inventory)/.test(s) || /deliver.*(feed|inventory|listing)/.test(s),
    text: 'After they accept, we send ready vehicles on a schedule.',
  },
  {
    test: s => /reviews? the application|grants access|may take days/.test(s) || /review.*(feed|live|ads)/.test(s),
    text: 'They review your store before shoppers can see listings. This can take a few days.',
  },
  {
    test: s => /appear.*(once|after|approv)/.test(s),
    text: 'They review what we send before shoppers can see it. That can take a day or two.',
  },
  {
    test: s => /logs? in to the partner portal|manually submits|uploads? inventory/.test(s),
    text: 'Listings are submitted on their website. Ask support if you need help.',
  },
  {
    test: s => /manual re-submission|each change cycle/.test(s),
    text: 'When inventory changes, those listings must be updated again on their website.',
  },
  {
    test: s => /adf|crm email|inbound email/.test(s),
    text: 'Get the lead inbox address from your CRM, then add it here so new inquiries land there.',
  },
  {
    test: s => /test lead/.test(s),
    text: 'Send a test inquiry and confirm it arrived in your CRM.',
  },
  {
    test: s => /no shared system|developer keys/.test(s),
    text: 'You only need the details they give your store.',
  },
  {
    test: s => /(system|we).*(post|creat|manag|rout)/.test(s),
    text: 'After you connect, we send updates there for you.',
  },
];

export function rewriteSetupStep(step: string): string {
  const s = step.toLowerCase();
  for (const rule of STEP_RULES) {
    if (rule.test(s)) return rule.text;
  }
  if (isTechnicalText(step)) {
    return 'Ask DealerGrid support to finish this step with them. You do not enter technical details.';
  }
  return step;
}

export function presentSetupSteps(steps: string[]): { dealerSteps: string[]; technicalSteps: string[] } {
  const dealerSteps = steps
    .map(rewriteSetupStep)
    .filter((step, index, list) => step !== list[index - 1]);
  return {
    dealerSteps,
    technicalSteps: steps.filter(isTechnicalText),
  };
}

export function presentValidationNote(note: string | null | undefined): {
  dealer: string;
  technical: string | null;
} {
  if (!note) return { dealer: '', technical: null };
  if (!isTechnicalText(note)) return { dealer: note, technical: null };
  return {
    dealer: 'They have not confirmed they received your listings yet. Connected does not mean they already show them.',
    technical: note,
  };
}

export function dealerFacingMissingLabels(labels: string[]): { dealer: string[]; technicalHidden: boolean } {
  const dealer = labels.filter(label => !isTechnicalText(label));
  const technicalHidden = labels.some(label => isTechnicalText(label));
  if (technicalHidden) {
    return {
      dealer: [...dealer, 'Ask support to enter the file-transfer details'],
      technicalHidden: true,
    };
  }
  return { dealer, technicalHidden: false };
}
