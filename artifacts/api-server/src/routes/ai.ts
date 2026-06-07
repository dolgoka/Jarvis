import { Router, type IRouter } from "express";
import { eq, isNull } from "drizzle-orm";
import { db, businessesTable, reportsTable, eventsTable } from "@workspace/db";
import { GetAiSummaryQueryParams, GetAiSummaryResponse, AiChatBody, AiChatResponse } from "@workspace/api-zod";
import OpenAI from "openai";

const router: IRouter = Router();

function makeClient() {
  // Replit AI Integrations proxy takes priority; falls back to standard OPENAI_API_KEY for Railway/self-hosted
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No OpenAI API key configured (set OPENAI_API_KEY)");
  return new OpenAI({ ...(baseURL ? { baseURL } : {}), apiKey });
}

async function buildBusinessContext(period = "month") {
  const businesses = await db.select().from(businessesTable);
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.period, period));
  const events = await db.select().from(eventsTable).where(isNull(eventsTable.dismissedAt));

  return businesses.map(b => {
    const bReports = reports.filter(r => r.businessId === b.id);
    const latest = bReports.sort((a, z) => z.date.localeCompare(a.date))[0];
    const bEvents = events
      .filter(e => e.businessId === b.id)
      .map(e => ({ severity: e.severity, text: e.text }));
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
    };
  });
}

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

  const { message } = body.data;
  const context = await buildBusinessContext("month");

  const healthLabel = (h: string) => h === "green" ? "норма" : h === "yellow" ? "внимание" : "критично";
  const currencyFmt = (val: number, cur: string) => {
    if (cur === "RUB") return `${(val).toLocaleString("ru-RU")} ₽`;
    return `$${(val).toLocaleString("en-US")}`;
  };

  const contextLines = context.map(b => {
    const evStr = b.events.length > 0
      ? b.events.map(e => `[${e.severity}] ${e.text}`).join("; ")
      : "нет активных событий";
    return `• ${b.name} (${b.city}, ${b.country}) | сектор: ${b.sector} | статус: ${healthLabel(b.health)} | валюта: ${b.currency} | выручка за мес: ${currencyFmt(b.revenue, b.currency)} | прибыль: ${currencyFmt(b.profit, b.currency)} | заказов: ${b.orders} | менеджер: ${b.managerName} (${b.managerEmail}) | события: ${evStr}`;
  }).join("\n");

  const systemPrompt = `Ты — JARVIS, бизнес-ассистент командного центра. У тебя полный доступ к данным портфеля из 14 компаний.

Данные портфеля (30-дневный период):
${contextLines}

Правила ответа:
- Отвечай ТОЛЬКО на русском языке.
- Отвечай кратко и по делу — не более 150 слов, если не просят подробностей.
- Используй только данные из портфеля выше, не выдумывай цифры.
- Если спрашивают про конкретную компанию — цитируй точные цифры из данных.
- Статус: «критично» = красный светофор, «внимание» = жёлтый, «норма» = зелёный.
- Финансы Profimonsters — в рублях (₽), остальные — в долларах ($).
- Говори уверенно и профессионально, без воды.`;

  const client = makeClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
  });

  const reply = completion.choices[0]?.message?.content ?? "Unable to process request.";

  res.json(AiChatResponse.parse({
    reply,
    timestamp: new Date().toISOString(),
  }));
});

export default router;
