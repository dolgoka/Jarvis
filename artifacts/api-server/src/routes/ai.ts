import { Router, type IRouter } from "express";
import { eq, isNull } from "drizzle-orm";
import { db, businessesTable, reportsTable, eventsTable, tasksTable, peopleTable } from "@workspace/db";
import { GetAiSummaryQueryParams, GetAiSummaryResponse, AiChatBody, AiChatResponse } from "@workspace/api-zod";
import OpenAI from "openai";

const router: IRouter = Router();

function makeClient() {
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No OpenAI API key configured (set OPENAI_API_KEY)");
  return new OpenAI({ ...(baseURL ? { baseURL } : {}), apiKey });
}

// ── Number formatting ────────────────────────────────────────────────────────

function fmtNum(n: number, unit: string): string {
  const isRub = unit === "₽" || unit === "RUB";
  const sym = isRub ? "₽" : "$";
  const abs = Math.abs(n);
  if (isRub) {
    if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace(".", ",")} млрд ${sym}`;
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} млн ${sym}`;
    return `${n.toLocaleString("ru-RU")} ${sym}`;
  } else {
    if (abs >= 1_000_000_000) return `${sym}${(n / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sym}${(n / 1_000).toFixed(0)}K`;
    return `${sym}${n}`;
  }
}

function fmtDelta(plan: number, actual: number, lowerIsBetter = false): string {
  if (plan === 0) return "";
  const pct = ((actual - plan) / Math.abs(plan)) * 100;
  const better = lowerIsBetter ? pct < 0 : pct > 0;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}% ${better ? "✅" : "🔴"}`;
}

// ── Data builders ────────────────────────────────────────────────────────────

async function buildBusinessContext(period = "month") {
  const [businesses, reports, events] = await Promise.all([
    db.select().from(businessesTable),
    db.select().from(reportsTable).where(eq(reportsTable.period, period)),
    db.select().from(eventsTable).where(isNull(eventsTable.dismissedAt)),
  ]);

  return businesses.map(b => {
    const bReports = reports.filter(r => r.businessId === b.id);
    const latest = bReports.sort((a, z) => z.date.localeCompare(a.date))[0];
    const bEvents = events
      .filter(e => e.businessId === b.id)
      .map(e => ({ severity: e.severity, text: e.text }));

    const analytics = b.analytics as {
      stage?: string;
      contour?: string;
      responsible?: { name: string; role: string } | null;
      whyColor?: string;
      planFact?: Array<{ metric: string; plan: number; actual: number; unit: string; lowerIsBetter?: boolean }>;
    } | null;

    return {
      id: b.id,
      name: b.name,
      city: b.city,
      country: b.country,
      sector: b.industry,
      status: b.status,
      health: b.health,
      currency: b.currency ?? "USD",
      managerName: b.managerName,
      managerEmail: b.managerEmail,
      revenue: latest?.revenue ?? 0,
      profit: latest?.profit ?? 0,
      orders: latest?.orders ?? 0,
      events: bEvents,
      analytics,
    };
  });
}

async function buildTasksContext() {
  const [tasks, allPeople] = await Promise.all([
    db.select().from(tasksTable),
    db.select().from(peopleTable),
  ]);

  return tasks.map(t => {
    const assignee = allPeople.find(p => p.id === t.assigneeId);
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      assigneeName: assignee?.name ?? "—",
      assigneeRole: assignee?.role ?? "—",
      status: t.status,
      stuckDays: t.stuckDays ?? null,
      createdAt: t.createdAt.toISOString().slice(0, 10),
    };
  });
}

// ── Translations ─────────────────────────────────────────────────────────────

const STAGE_RU: Record<string, string> = {
  idea: "идея",
  launch: "запуск",
  growth: "рост",
  operational: "операционная",
  scaling: "масштабирование",
  mature: "зрелость",
  restructuring: "реструктуризация",
  exit: "выход",
};

const CONTOUR_RU: Record<string, string> = {
  external: "внешний",
  internal: "внутренний",
  holding: "холдинг",
  subsidiary: "дочерняя",
  jv: "СП",
};

function ruStage(s?: string | null): string {
  if (!s) return "—";
  return STAGE_RU[s.toLowerCase()] ?? s;
}

function ruContour(c?: string | null): string {
  if (!c) return "—";
  return CONTOUR_RU[c.toLowerCase()] ?? c;
}

// ── Build system prompt ──────────────────────────────────────────────────────

function buildSystemPrompt(
  businesses: Awaited<ReturnType<typeof buildBusinessContext>>,
  tasks: Awaited<ReturnType<typeof buildTasksContext>>,
): string {
  const healthIcon = (h: string) => h === "green" ? "🟢" : h === "yellow" ? "🟡" : "🔴";

  const bizLines = businesses.map(b => {
    const a = b.analytics;
    const cur = b.currency;

    const planFactLines = a?.planFact?.map(pf => {
      const planFmt = fmtNum(pf.plan, pf.unit);
      const actualFmt = fmtNum(pf.actual, pf.unit);
      const delta = fmtDelta(pf.plan, pf.actual, pf.lowerIsBetter);
      return `    ${pf.metric}: план ${planFmt} → факт ${actualFmt} ${delta}`;
    }).join("\n") ?? "    нет данных";

    const responsibleLine = a?.responsible
      ? `${a.responsible.name} (${a.responsible.role})`
      : "НЕ НАЗНАЧЕН — слепая зона";

    const eventsLine = b.events.length > 0
      ? b.events.map(e => `[${e.severity}] ${e.text}`).join("; ")
      : "нет";

    return `
── ${b.name} ──
  Статус: ${healthIcon(b.health)} | Причина: ${a?.whyColor ?? "нет данных"}
  Ответственный: ${responsibleLine}
  Стадия: ${ruStage(a?.stage)} | Контур: ${ruContour(a?.contour)} | Сектор: ${b.sector}
  Локация: ${b.city}, ${b.country}
  Финансы (${cur}): Выручка ${fmtNum(b.revenue, cur === "RUB" ? "₽" : "$")} | Прибыль ${fmtNum(b.profit, cur === "RUB" ? "₽" : "$")} | Заказы ${b.orders}
  Отклонения план-факт:
${planFactLines}
  События: ${eventsLine}`.trim();
  }).join("\n\n");

  const taskStatusLabel = (s: string, stuck: number | null) => {
    if (s === "stuck") return `🔴 застряла${stuck ? ` (${stuck} дн)` : ""}`;
    if (s === "accepted") return "🟡 принята";
    return "⬜ ожидает";
  };

  const taskLines = tasks.length > 0
    ? tasks.map(t =>
        `  • [${taskStatusLabel(t.status, t.stuckDays)}] "${t.title}" — исполнитель: ${t.assigneeName} (${t.assigneeRole}), создана: ${t.createdAt}`
      ).join("\n")
    : "  нет активных задач";

  return `Ты — JARVIS, бизнес-ассистент командного центра. У тебя полный доступ к данным портфеля.

═══════════════════ ПОРТФЕЛЬ КОМПАНИЙ ═══════════════════
${bizLines}

═══════════════════ ЗАДАЧИ ВНУТРЕННЕГО КРУГА ═══════════════════
${taskLines}

═══════════════════ ПРАВИЛА ═══════════════════
ФОРМАТ ОТВЕТА НА ВОПРОС О КОМПАНИИ — строго такой шаблон, каждый пункт на отдельной строке:

🔴/🟡/🟢 [Краткая причина статуса одним предложением]

👤 Ответственный: [Имя (Должность)] — или «не назначен, слепая зона»
📍 Стадия: [стадия по-русски] | Контур: [контур по-русски]

📊 Отклонения план-факт:
• [Метрика]: план X → факт Y (+Z% ✅ / −Z% 🔴)
• [Метрика]: план X → факт Y (+Z% ✅ / −Z% 🔴)

[Если есть задачи с явным упоминанием компании:]
📋 Задачи: • «[название]» — [исполнитель], [статус]

[Итоговый вывод одним предложением — ключевой риск или сигнал к действию]

ВАЖНО: Стадию и контур всегда пиши по-русски (операционная, внешний и т.д.)
Задачи — ТОЛЬКО если в названии/описании задачи явно упоминается название компании.

ОБЩИЕ ПРАВИЛА:
- Отвечай ТОЛЬКО по-русски, уверенно и профессионально
- Числа форматируй красиво: «5,46 млрд ₽», «$34,7M», не сырые числа
- Помни контекст диалога — на уточнения отвечай кратко, без повтора всего briefing'а
- Если данных нет — честно скажи, не выдумывай цифры
- Финансы Profimonsters в рублях (₽), остальные в долларах ($)`;
}

// ── Routes ───────────────────────────────────────────────────────────────────

router.get("/ai/summary", async (req, res): Promise<void> => {
  const query = GetAiSummaryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const period = query.data.period ?? "month";
  const businessSummaries = await buildBusinessContext(period);

  if (businessSummaries.length === 0) {
    res.json(GetAiSummaryResponse.parse({
      period,
      summary: "No businesses connected yet.",
      highlights: ["No data available"],
      generatedAt: new Date().toISOString(),
    }));
    return;
  }

  const totalRevenue = businessSummaries.reduce((s, b) => s + b.revenue, 0);
  const totalProfit = businessSummaries.reduce((s, b) => s + b.profit, 0);
  const totalOrders = businessSummaries.reduce((s, b) => s + b.orders, 0);

  const client = makeClient();
  const prompt = `You are a chief intelligence officer for a global enterprise. Analyze this ${period} business performance data.

${businessSummaries.length} businesses. Revenue: $${totalRevenue.toLocaleString()}, Profit: $${totalProfit.toLocaleString()}, Orders: ${totalOrders.toLocaleString()}

Data:
${JSON.stringify(businessSummaries, null, 2)}

Respond in JSON: {"summary":"2-3 sentence executive summary","highlights":["bullet 1","bullet 2","bullet 3","bullet 4","bullet 5"]}
Be direct, data-driven. Identify top performers, underperformers, and recommend focus areas.`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { summary?: string; highlights?: string[] } = {};
  try { parsed = JSON.parse(content); } catch { parsed = { summary: content, highlights: [] }; }

  res.json(GetAiSummaryResponse.parse({
    period,
    summary: parsed.summary ?? "No summary available.",
    highlights: parsed.highlights ?? [],
    generatedAt: new Date().toISOString(),
  }));
});

router.post("/ai/chat", async (req, res): Promise<void> => {
  const body = AiChatBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { message, history = [] } = body.data;

  const [businesses, tasks] = await Promise.all([
    buildBusinessContext("month"),
    buildTasksContext(),
  ]);

  const systemPrompt = buildSystemPrompt(businesses, tasks);

  // Trim history to last 20 messages (10 exchanges) to stay within token budget
  const trimmedHistory = (history as Array<{ role: "user" | "assistant"; content: string }>)
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content }));

  const client = makeClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...trimmedHistory,
      { role: "user", content: message },
    ],
  });

  const reply = completion.choices[0]?.message?.content ?? "Нет ответа.";

  res.json(AiChatResponse.parse({
    reply,
    timestamp: new Date().toISOString(),
  }));
});

export default router;
