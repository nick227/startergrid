# V2.5 Copy-Safe Patch

Apply this patch over the v2 project, then run:

```bash
npm install
npm run poc:green
npm run poc:risk
```

`poc:green` confirms the happy path.

`poc:risk` confirms the validator catches broken dealership data, broken vehicle data, stale platform profiles, and medium/low-confidence platform profiles.
