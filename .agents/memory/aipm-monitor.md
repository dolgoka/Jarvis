---
name: AI-PM monitor (C5)
description: Background task-health monitor — architecture, rules, idempotency, and resolve patterns
---

## What it does
`artifacts/api-server/src/lib/taskMonitor.ts` scans all non-terminal tasks on startup and every 12 min, writes idempotent `task_stuck` / `task_escalated` news items, and generates LLM text via gpt-4o-mini (with template fallbacks).

## Rules (hours thresholds)
| Status | acceptedAt | Idle h | Event | Recipient |
|--------|-----------|--------|-------|-----------|
| sent | null | >8 | task_stuck (attention) | employee |
| sent | null | >16 | task_escalated (critical) | owner/director |
| in_progress / returned | — | >24 | task_stuck (attention) | employee |
| in_progress / returned | — | >48 | task_escalated (critical) | owner/director |
| kind=approval, sent | — | >12 | task_stuck (attention) | owner/director |

## Idempotency
`hasActive(taskId, type)` checks for an existing `status='new'` row with same taskId+type before inserting.

## Auto-resolve on task progression
`writeActivity` in tasks.ts has a `RESOLVE_STUCK_TYPES` Set — for activity types `accepted`, `accepted_final`, `submitted`, `returned` it calls `resolveStuckEvents(taskId)` which marks all active task_stuck/task_escalated rows as `status='done'`.

## DB enum
`newsTypeEnum` in `lib/db/src/schema/feed.ts` extended with `task_stuck`, `task_escalated`.

## API endpoints added
- `POST /tasks/ping?id=X` — operationId `pingTask` — writes `pinged` activity + task_stuck event to employee
- `POST /tasks/escalate?id=X` — operationId `escalateTask` — writes `escalated` activity + task_escalated event to owner/director

## Frontend
- `NewsFeedOverlay.tsx`: `usePingTask` + `useEscalateTask` hooks; buttons "👊 Пнуть" / "Открыть →" / "⬆ Эскалировать" for task_stuck; "👊 Пнуть" / "Открыть задачу →" for task_escalated
- `DirectorBoardPage.tsx`: `hoursAgo()` helper; inline badges "не принята" (>8h, sent) and "зависла" (>24h, in_progress/returned)

## Seed
`scripts/src/seed-stuck-demo.ts` — 3 demo tasks with old `lastActivityAt` (10h, 30h, 52h ago); run `pnpm --filter @workspace/scripts run seed:stuck`

**Why:** startMonitor must be called after `app.listen()` callback, not before — ensures DB is ready and port is bound first.
