---
name: Task activity journal
description: Architecture decisions for the task_activity table and how it integrates with tasks workflow
---

# Task Activity Journal

## Schema
- New table `task_activity` (lib/db/src/schema/task_activity.ts): id, taskId→tasks.id (cascade delete), type (enum), actorRole (text), text (nullable), at (timestamp)
- Enum `task_activity_type`: created/accepted/decomposed/submitted/accepted_final/returned/commented/escalated/pinged
- Tasks table gained 4 new fields: kind (enum task/approval), approverRole, acceptedAt, blockedByApprovalId

## API pattern
- `writeActivity({ taskId, type, actorRole, text?, at? })` helper in routes/tasks.ts called after every status transition
- GET /tasks/activity?id={taskId} — query-only param (no path param) to avoid Zod/TS collision in api-zod barrel
- New routes: POST /tasks/start (sent→in_progress, writes 'accepted'), POST /tasks/submit (in_progress→review, writes 'submitted')

## Seed guard issue
- seedTasks.ts guard skips if review rows exist — backfill won't run via seed:tasks
- For new installs: seed writes activity in seedDemoTasks loop directly
- For existing DBs: run a one-off backfill script (see scripts/src pattern)

**Why:** Seed scripts are idempotent but the activity insertion is inside the "if no review rows" branch. Any re-run of seed skips to resultNote patching only.

## Frontend
- ActivityTimeline component in TasksPage.tsx uses useGetTaskActivity hook
- Shows vertical timeline with colored dots, role + timestamp, and optional note text
- Replaces the old static 2-node horizontal "Хронология" with real data
