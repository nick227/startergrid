import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { orderMediaForCardDisplay } from '../services/marketplace/mediaSlotMapping.js';

describe('orderMediaForCardDisplay', () => {
  it('puts main-photo first even when it has a higher sort order', () => {
    const ordered = orderMediaForCardDisplay([
      { url: 'https://cdn.example.com/front.jpg', sortOrder: 0, mediaSlotKey: 'front' },
      { url: 'https://cdn.example.com/main.jpg', sortOrder: 5, mediaSlotKey: 'main-photo' },
      { url: 'https://cdn.example.com/rear.jpg', sortOrder: 6, mediaSlotKey: 'rear' },
    ]);
    assert.equal(ordered[0]!.url, 'https://cdn.example.com/main.jpg');
  });
});
