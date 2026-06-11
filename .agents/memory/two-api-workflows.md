---
name: Two API server workflows
description: Which API server workflow to restart and why
---

Two workflows both try to run the API server on port 8080:

- **"API Server"** — runs `build && PORT=8080 start`. This is the resident process that actually holds port 8080. **Restart this one** to pick up backend code changes.
- **"artifacts/api-server: API Server"** — runs `dev` (build+start). Fails with EADDRINUSE whenever "API Server" is already running.

**Why:** "API Server" always starts first and stays resident. The artifacts dev workflow can't bind the same port.

**How to apply:** After backend code changes, restart "API Server". Never try to restart "artifacts/api-server: API Server" when "API Server" is running — it will always fail with EADDRINUSE.
