# v2.5.1 Patch Manifest

Changed/new files only:

```txt
src/fixtures/stalePlatformProfiles.fixture.ts
package.json
README_V2.5.1.md
PATCH_MANIFEST.md
```

Purpose:

- Fix stale-profile risk matrix coverage.
- Ensure all platform profiles become stale in the `STALE_PROFILE` scenario.
- Preserve v2.5 happy-path and negative-fixture behavior.
