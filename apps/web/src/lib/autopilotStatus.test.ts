import { describe, it, expect } from 'vitest';
import { describeAutopilot } from './autopilotStatus.ts';

describe('describeAutopilot', () => {
  it('does not claim live distribution when preference is off', () => {
    const view = describeAutopilot({ preference: 'OFF', connectedChannelCount: 4 });
    expect(view.label).toBe('Off');
    expect(view.canPause).toBe(false);
    expect(view.summary).toMatch(/not on/i);
  });

  it('treats on without verification as intent only', () => {
    const view = describeAutopilot({ preference: 'ON', connectedChannelCount: 2 });
    expect(view.label).toBe('On · not verified yet');
    expect(view.guidance).toMatch(/not the same as live/i);
  });

  it('allows resume only when paused', () => {
    const view = describeAutopilot({ preference: 'PAUSED' });
    expect(view.canResume).toBe(true);
    expect(view.canPause).toBe(false);
  });
});
