---
name: Director board chain
description: How the 3-link task chain (client→director→staff→director→client) is implemented
---

## The rule
`createdByPersonId INTEGER` on `tasksTable` is the key that distinguishes "task from director to staff" vs "task from owner to director". This drives all four board columns and feed routing.

**Why:** text `createdBy` field is only a label — can't be filtered reliably. An integer FK on the creator person is the only queryable discriminator.

**How to apply:**
- Director creates task for staff → pass `createdByPersonId: directorPersonId` + `createdBy: "director"` in POST /tasks
- GET /tasks?assigneeId=directorPersonId → director's own inbox (columns 1, 2, 4)
- GET /tasks?createdByPersonId=directorPersonId → tasks delegated down (columns 2b, 3)
- In tasks/submit: if task.createdByPersonId is set → recipientRole='director' for task_review feed event; else → 'owner'
- In tasks/start: if task.createdByPersonId is set → recipientRole='director' for task_accepted; else → 'owner'
- Feed recipientRole='director' already supported by feedNews.ts filter; no changes needed there

## Column mapping
| Column | Query | Action |
|--------|-------|--------|
| Входящие | assigneeId=me, status=sent | start (→in_progress) |
| В работе | assigneeId=me status=in_progress + createdByPersonId=me status=in_progress/returned | submit upward (mine), view delegated status |
| На приёмке снизу | createdByPersonId=me, status=review | accept or return |
| Готово | assigneeId=me, status=done | read-only |
