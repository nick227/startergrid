import { describe, it, expect } from 'vitest';
import { ownerLabel, ownershipSentence } from './taskOwnership.ts';

describe('ownerLabel', () => {
  it('names dealership tasks as the dealer', () => {
    expect(ownerLabel('DEALER', 'Jordan')).toBe('Dealership · Jordan');
  });

  it('names internal work as our team', () => {
    expect(ownerLabel('OUR_TEAM', 'Maya')).toBe('Our team · Maya');
  });
});

describe('ownershipSentence', () => {
  it('joins action, owner, and due', () => {
    expect(ownershipSentence({
      action: 'confirm inventory',
      ownerKind: 'OUR_TEAM',
      ownerName: 'Maya',
      due: 'due today',
    })).toBe('Next: confirm inventory · Our team · Maya · due today');
  });
});
