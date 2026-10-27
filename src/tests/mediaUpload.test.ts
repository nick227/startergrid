import test from 'node:test';

// These upload hardening checks are not implemented yet. They were `assert.ok(true)`
// placeholders that reported as passing; as todos they show up as uncovered instead.
test('Media Upload Route - Hardening Tests', async (t) => {
  await t.test('rejects MIME types other than jpeg, png and webp', { todo: true });
  await t.test('rejects files above 15MB', { todo: true });
  await t.test('returns 404/403 for uploads to vehicles the dealership does not own', { todo: true });
  await t.test('slot uploads create media with the STRUCTURED_SHOT role', { todo: true });
  await t.test('bulk uploads create media with the GALLERY_IMAGE role', { todo: true });
});
