import { db, tasksTable, newsItemsTable, taskActivityTable, peopleTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import OpenAI from "openai";

const HOUR_MS = 3_600_000;
const NOT_ACCEPTED_WARN_H  = 8;
const NOT_ACCEPTED_ESCL_H  = 16;
const STUCK_WARN_H         = 24;
const STUCK_ESCL_H         = 48;
const APPROVAL_REMIND_H    = 12;
const MONITOR_INTERVAL_MS  = 12 * 60 * 1_000;

function makeClient() {
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey  = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? process.env["OPENAI_API_KEY"];
  if (!apiKey) return null;
  return new OpenAI({ ...(baseURL ? { baseURL } : {}), apiKey });
}

async function genText(
  title: string,
  roleLabel: string,
  hoursIdle: number,
  kind: "not_accepted" | "stuck" | "escalated" | "approval_pending",
): Promise<string> {
  const d = hoursIdle >= 24
    ? `${Math.round(hoursIdle / 24)} дн.`
    : `${Math.round(hoursIdle)} ч.`;
  const fallbacks: Record<string, string> = {
    not_accepted:     `Задача «${title}» не принята ${d} — ${roleLabel} не реагирует`,
    stuck:            `Задача «${title}» зависла у ${roleLabel} на ${d} — нет движения`,
    escalated:        `Задача «${title}» застряла на ${d} — требует эскалации`,
    approval_pending: `Согласование «${title}» ожидает ответа уже ${d}`,
  };
  const fallback = fallbacks[kind] ?? `Задача «${title}» требует внимания`;

  const client = makeClient();
  if (!client) return fallback;
  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Ты краткий ИИ-PM. Пиши по-русски, одним предложением до 15 слов, деловой тон, без кавычек вначале и в конце.",
        },
        {
          role: "user",
          content: `Задача: "${title}". Исполнитель: ${roleLabel}. Простой: ${d}. Тип события: ${kind}. Уведомление для владельца.`,
        },
      ],
      max_tokens: 80,
      temperature: 0.7,
    });
    return res.choices[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

async function hasActive(taskId: number, type: "task_stuck" | "task_escalated"): Promise<boolean> {
  const rows = await db
    .select({ id: newsItemsTable.id })
    .from(newsItemsTable)
    .where(and(
      eq(newsItemsTable.taskId, taskId),
      eq(newsItemsTable.type, type),
      eq(newsItemsTable.status, "new"),
    ))
    .limit(1);
  return rows.length > 0;
}

export async function resolveStuckEvents(taskId: number): Promise<void> {
  await db
    .update(newsItemsTable)
    .set({ status: "done" })
    .where(and(
      eq(newsItemsTable.taskId, taskId),
      inArray(newsItemsTable.type, ["task_stuck", "task_escalated"]),
      eq(newsItemsTable.status, "new"),
    ));
}

export async function runMonitor(): Promise<void> {
  console.log("[taskMonitor] Scan started");
  try {
    const [tasks, allPeople] = await Promise.all([
      db.select().from(tasksTable),
      db.select().from(peopleTable),
    ]);

    let created = 0;

    for (const task of tasks) {
      if (task.status === "done" || task.status === "draft") continue;

      const assignee  = allPeople.find(p => p.id === task.assigneeId);
      const roleLabel = assignee?.role ?? "исполнитель";
      const hoursIdle = (Date.now() - task.lastActivityAt.getTime()) / HOUR_MS;
      const escalateRecipient: "owner" | "director" =
        task.createdByPersonId ? "director" : "owner";

      // ── Rule 1 & 2: sent + acceptedAt null ──────────────────────────
      if (task.status === "sent" && !task.acceptedAt) {
        if (hoursIdle >= NOT_ACCEPTED_ESCL_H) {
          if (!(await hasActive(task.id, "task_escalated"))) {
            const body = await genText(task.title, roleLabel, hoursIdle, "escalated");
            await db.insert(newsItemsTable).values({
              taskId: task.id, type: "task_escalated", severity: "critical",
              title: "Эскалация: задача не принята",
              body, recipientRole: escalateRecipient,
              sourceLabel: "ИИ-PM", isUrgentFlag: true, actionable: true, status: "new",
            });
            await db.insert(taskActivityTable).values({
              taskId: task.id, type: "escalated", actorRole: "system",
              text: body, at: new Date(),
            });
            created++;
          }
        } else if (hoursIdle >= NOT_ACCEPTED_WARN_H) {
          if (!(await hasActive(task.id, "task_stuck"))) {
            const body = await genText(task.title, roleLabel, hoursIdle, "not_accepted");
            await db.insert(newsItemsTable).values({
              taskId: task.id, type: "task_stuck", severity: "attention",
              title: "Задача не принята",
              body, recipientRole: "employee",
              sourceLabel: "ИИ-PM", isUrgentFlag: false, actionable: true, status: "new",
            });
            created++;
          }
        }
      }

      // ── Rule 3 & 4: in_progress / returned stuck ────────────────────
      if (task.status === "in_progress" || task.status === "returned") {
        if (hoursIdle >= STUCK_ESCL_H) {
          if (!(await hasActive(task.id, "task_escalated"))) {
            const body = await genText(task.title, roleLabel, hoursIdle, "escalated");
            await db.insert(newsItemsTable).values({
              taskId: task.id, type: "task_escalated", severity: "critical",
              title: "Эскалация: задача зависла",
              body, recipientRole: escalateRecipient,
              sourceLabel: "ИИ-PM", isUrgentFlag: true, actionable: true, status: "new",
            });
            await db.insert(taskActivityTable).values({
              taskId: task.id, type: "escalated", actorRole: "system",
              text: body, at: new Date(),
            });
            created++;
          }
        } else if (hoursIdle >= STUCK_WARN_H) {
          if (!(await hasActive(task.id, "task_stuck"))) {
            const body = await genText(task.title, roleLabel, hoursIdle, "stuck");
            await db.insert(newsItemsTable).values({
              taskId: task.id, type: "task_stuck", severity: "attention",
              title: "Задача зависла",
              body, recipientRole: "employee",
              sourceLabel: "ИИ-PM", isUrgentFlag: false, actionable: true, status: "new",
            });
            created++;
          }
        }
      }

      // ── Rule 5: approval pending ─────────────────────────────────────
      if (task.kind === "approval" && task.status === "sent") {
        if (hoursIdle >= APPROVAL_REMIND_H) {
          if (!(await hasActive(task.id, "task_stuck"))) {
            const body = await genText(task.title, roleLabel, hoursIdle, "approval_pending");
            await db.insert(newsItemsTable).values({
              taskId: task.id, type: "task_stuck", severity: "attention",
              title: "Согласование ожидает ответа",
              body, recipientRole: escalateRecipient,
              sourceLabel: "ИИ-PM", isUrgentFlag: false, actionable: true, status: "new",
            });
            created++;
          }
        }
      }
    }

    console.log(`[taskMonitor] Scan done — ${created} new event(s)`);
  } catch (err) {
    console.error("[taskMonitor] Scan error:", err);
  }
}

export function startMonitor(): void {
  runMonitor().catch(err => console.error("[taskMonitor] startup error:", err));
  setInterval(() => {
    runMonitor().catch(err => console.error("[taskMonitor] interval error:", err));
  }, MONITOR_INTERVAL_MS);
}
