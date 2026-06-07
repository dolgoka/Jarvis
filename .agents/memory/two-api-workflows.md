---
name: Two API server workflows
description: There are two overlapping API server workflows; only one works
---

Two workflows both try to run the API server on port 8080:
- "API Server" — runs `pnpm run build && node dist/index.mjs` (production mode), always fails with EADDRINUSE because the artifact workflow is already running
- "artifacts/api-server: API Server" — runs `pnpm run dev` (build+start), this is the one that works

**Why:** Both were created at different points. The "API Server" one was the original; the artifact workflow was added later and is the correct one to use.

**How to apply:** Always restart "artifacts/api-server: API Server", never "API Server". The "API Server" workflow will always fail with EADDRINUSE.
