const TECHNICAL_RE =
  /\b(sftp|ftp|xml|json feed|feed url|feed file|feed endpoint|whitelist|ip address|api keys?|host\b|port\b|credentials?|ingestion|homenet|username|password|tokens?|secrets?)\b/i;

export function isTechnicalText(text: string): boolean {
  return TECHNICAL_RE.test(text);
}

export function isTechnicalField(field: { field: string; label: string; isSecret?: boolean }): boolean {
  return !!field.isSecret || isTechnicalText(`${field.field} ${field.label}`);
}

export function rewriteSetupStep(step: string): string {
  const s = step.toLowerCase();
  if (
    /(sftp|ftp|homenet).*(enter|credential|username|password)/.test(s) ||
    /enter.*(sftp|ftp|credential|username|password|homenet)/.test(s)
  ) {
    return 'Ask StarterGrid support to enter the file-transfer details they gave you.';
  }
  if (s.includes('whitelist') || (s.includes('ip') && (s.includes('provider') || s.includes('allow')))) {
    return 'They may need to allow StarterGrid. Support handles that with them.';
  }
  if (/(provides?|provided).*(feed|credential)/.test(s) || /feed (endpoint|url|credential)/.test(s)) {
    return 'After they approve your account, they send the details needed to start listing.';
  }
  if (/(contact|request|ask)/.test(s) && /(rep|ingestion|sftp|feed|homenet)/.test(s)) {
    return 'Ask your contact there to turn on inventory updates for your store.';
  }
  if (/save.*(validat|credential|test|check)/.test(s)) {
    return 'Save the details, then use Check connection.';
  }
  if (/confirm.*(feed|listing|live|accepted)/.test(s)) {
    return 'Ask them to confirm they received your listings. Connected does not mean they are live yet.';
  }
  if (/confirm.*(account|dealer center|active)/.test(s)) {
    return 'Make sure your dealer account with them is active.';
  }
  if (isTechnicalText(step)) {
    return 'Support completes this technical step with them.';
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
    dealer: 'They have not confirmed they received your listings yet. Connected does not mean listings are live.',
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
