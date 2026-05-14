import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, businessesTable, reportsTable } from "@workspace/db";
import { GetAiSummaryQueryParams, GetAiSummaryResponse, AiChatBody, AiChatResponse } from "@workspace/api-zod";
import OpenAI from "openai";

const router: IRouter = Router();

function makeClient() {
  return new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  });
}

async function buildBusinessContext(period = "month") {
  const businesses = await db.select().from(businessesTable);
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.period, period));

  return businesses.map(b => {
    const bReports = reports.filter(r => r.businessId === b.id);
    const latest = bReports.sort((a, z) => z.date.localeCompare(a.date))[0];
    return {
      id: b.id,
      name: b.name,
      city: b.city,
      country: b.country,
      sector: b.sector,
      status: b.status,
      managerName: b.managerName,
      revenue: latest?.revenue ?? 0,
      profit: latest?.profit ?? 0,
      orders: latest?.orders ?? 0,
      notes: latest?.notes ?? null,
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

  const systemPrompt = `You are JARVIS, an elite AI business intelligence officer with full access to the owner's global portfolio. You have deep knowledge of every business node, its financials, location, and performance.

Current portfolio snapshot (30-day data):
${JSON.stringify(context, null, 2)}

Answer questions concisely and precisely. Use data from the portfolio when relevant. Speak as a confident executive briefing officer — no hedging, no filler. If asked about a specific business, quote exact numbers. Keep responses under 200 words unless detailed analysis is requested.`;

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
