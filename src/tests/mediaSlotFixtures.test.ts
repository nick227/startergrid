import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assignDetailMediaSlots,
  buildDefaultMediaTour,
  mapDbMediaToDetailMedia,
} from '../services/marketplace/mediaSlotFixtures.js';

type DbMedia = {
  id: string;
  url: string;
  sortOrder: number;
  kind?: string;
  mimeType?: string | null;
};

function media(id: string, sortOrder: number, kind = 'IMAGE'): DbMedia {
  return { id, url: `https://cdn.example.com/${id}.jpg`, sortOrder, kind, mimeType: 'image/jpeg' };
}

describe('mediaSlotFixtures — slot assignment', () => {
  it('assigns first image to HERO and doors-open kind to SLOT_6', () => {
    const items = assignDetailMediaSlots([
      media('m1', 0),
      media('m2', 1, 'DOORS_OPEN'),
    ]);
    assert.equal(items.find(i => i.id === 'm1')?.slot, 'HERO');
    assert.equal(items.find(i => i.id === 'm2')?.slot, 'SLOT_6');
    assert.equal(items.find(i => i.id === 'm2')?.angle, 'EXTERIOR_DOORS_OPEN');
  });

  it('places SPIN_360 media in overflow with embedUrl', () => {
    const items = assignDetailMediaSlots([
      { id: 'spin', url: 'https://embed.example.com/spin', sortOrder: 0, kind: 'SPIN_360' },
    ]);
    const spin = items.find(i => i.id === 'spin');
    assert.equal(spin?.slot, 'OVERFLOW');
    assert.equal(spin?.kind, 'SPIN_360');
    assert.equal(spin?.embedUrl, 'https://embed.example.com/spin');
  });

  it('fills sequential mosaic slots before overflow', () => {
    const items = assignDetailMediaSlots([
      media('m1', 0),
      media('m2', 1),
      media('m3', 2),
      media('m4', 3),
    ]);
    assert.deepEqual(
      items.filter(i => i.slot !== 'OVERFLOW').map(i => i.slot),
      ['HERO', 'SLOT_2', 'SLOT_3', 'SLOT_4'],
    );
  });
});

describe('mediaSlotFixtures — tour builder', () => {
  it('suppresses placeholder tours in mapped detail media', () => {
    const { items, tour } = mapDbMediaToDetailMedia([
      media('m1', 0),
      media('m2', 1, 'DOORS_OPEN'),
      media('m3', 2),
    ]);
    assert.ok(items.length >= 3);
    assert.equal(tour, null);
  });

  it('can still build highlight, issue, and neutral steps for a future walkthrough', () => {
    const items = assignDetailMediaSlots([
      media('m1', 0),
      media('m2', 1, 'DOORS_OPEN'),
      media('m3', 2),
    ]);
    const tour = buildDefaultMediaTour(items);
    assert.ok(tour);
    assert.equal(tour!.enabled, true);
    assert.ok(tour!.steps.some(step => step.stepType === 'NEUTRAL'));
    assert.ok(tour!.steps.some(step => step.stepType === 'HIGHLIGHT'));
    assert.ok(tour!.steps.every(step => items.some(item => item.id === step.mediaId)));
  });

  it('returns null tour for single-image listings', () => {
    const tour = buildDefaultMediaTour(assignDetailMediaSlots([media('m1', 0)]));
    assert.equal(tour, null);
  });
});
