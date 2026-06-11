---
name: Scripts seed pattern
description: How to write seed scripts in the @workspace/scripts package
---

Seed files live at `scripts/src/*.ts` and are run via `pnpm --filter @workspace/scripts run <scriptName>`.

**Import rules:**
- Import only from `@workspace/db` (re-exports all table definitions and `db`)
- Do NOT import from `drizzle-orm` directly — it is not a direct dependency of `@workspace/scripts`
- If you need `eq`/`inArray`/etc., either filter in JS after fetching all rows, or add `drizzle-orm` to scripts/package.json dependencies

**Add new seeds:** Add entry to `scripts/package.json` `scripts` block, e.g. `"seed:morning": "tsx ./src/seed-morning.ts"`.

**Why:** The scripts package only has `@workspace/db` as a dependency. Drizzle helpers (`eq`, `inArray`) come from drizzle-orm which is not installed in scripts' own node_modules.
